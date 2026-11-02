import { syncSemaphore } from "../semaphore";
import { applyRemoteOps } from "../apply";
import { isSharedGroup, getIdentity } from "../identity";
import { signAll } from "../ops";
import {
  downgradeStaleSentOps,
  listPendingOps,
  listPendingOpsBatch,
  listSentOps,
  markOpsSent,
  markOpsSynced,
  rebateSentOps,
} from "../outbox";
import {
  getDB,
  addCatalogueRequest,
  listPendingCatalogueRequests,
  markCatalogueRequestSnapshotSent,
} from "../../db";
import { emitShareOps, pairedEmployees } from "../sharing";
import { announceDevice } from "../pairing";
import { releaseSeat } from "@/lib/gatekeeper/seat";
import type {
  CatalogueRequestPayload,
  DeviceAnnouncePayload,
  DeviceApprovePayload,
  DeviceLeavePayload,
  SyncOp,
} from "../types";
import {
  KEY_LAST_SNAPSHOT,
  SNAPSHOT_THROTTLE_MS,
  type SyncState,
  type TransportClient,
} from "./types";
import { publishFreshCatalog } from "./catalog";
import { deliverSignaling, forwardToPeers, startWebRtcMesh } from "../webrtc";

/**
 * Pousse l'outbox vers le relais, tout de suite, sans attendre la fin de la rotation.
 *
 * Indispensable quand une op doit partir MAINTENANT (le stock d'un écran qui vient
 * de rejoindre) : la publication automatique, elle, ne se fait que si le catalogue a
 * changé — et l'op resterait dans l'outbox, invisible.
 */
async function pousserOutbox(client: TransportClient, shopId: string): Promise<boolean> {
  const pending = await listPendingOps(shopId);
  if (pending.length === 0) return false;
  const signed = await signAll(pending);
  if (!(await client.push(shopId, signed))) return false;
  await markOpsSynced(pending.map((o) => o.id));
  return true;
}

// PRESENCE (mission 3 niveaux) : « le patron est online » = son écran existe — l'API
// `/api/v1/presence` du relais est la source première — ou, repli, il a TIRÉ récemment
// chez le relais (2 min : le cycle de synchro est d'une minute, l'amplitude le couvre).
// Un relais muet (ni présence, ni preuve de vie) signifie le patron injoignable :
// on part en scénario 2, on ne perd JAMAIS silence pour absence de signal.
const PRESENCE_ONLINE_MS = 2 * 60_000;

// TTL du rattrapage : le même contrat que le relais (`OPS_TTL_MS`, 7 jours). Au-delà,
// les copies `sent` sont SANS ACK quand le relais a déjà supprimé ses propres backups :
// le drain re-part de zéro, la vente ne SAUTE jamais.
const SENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function isOwnerOnline(client: TransportClient, shopId: string): Promise<boolean> {
  const db = getDB();
  const owner = (await db.paired_devices.where("shop_id").equals(shopId).toArray()).find(
    (d) => d.role === "owner" && d.status !== "revoked",
  );
  if (!owner) return true; // personne à joindre connu : comportement historique (direct)
  const presence = await client.presence?.(shopId);
  if (presence) return presence.online.includes(owner.id);
  const seen = ((await client.peers?.(shopId)) ?? []).find((p) => p.device_id === owner.id);
  if (!seen) return false;
  return Date.now() - seen.last_pulled_at < PRESENCE_ONLINE_MS;
}

/** Cycle complet d'un appareil : pousse son outbox, tire ce que les autres ont laissé,
 *  rejoue les ops étrangères. Jamais bloquant : tout est déjà protégé en amont. */
export async function exchangeOps(client: TransportClient): Promise<SyncState> {
  const release = await syncSemaphore.acquire();
  try {
    const identity = getIdentity();
    console.log("[identity] Appareil courant :", identity.deviceId, "boutique :", identity.shopId);
    if (!isSharedGroup(identity.shopId)) return { pushed: 0, applied: 0, skipped: 0, remote: 0 };

    // Check if this device is paired (not pending) - skip sync if still pending
    const db = getDB();
    const self = await db.paired_devices.get(identity.deviceId);
    if (self?.status === "pending") {
      console.warn(`[exchangeOps] Device ${identity.deviceId} is pending, skipping exchange`);
      return { pushed: 0, applied: 0, skipped: 0, remote: 0 };
    }

    // Signature AU PUSH, pas à l'écriture : signer est une promesse WebCrypto, et une
    // transaction Dexie ne survit pas à cet await. L'outbox reste donc le journal brut
    // (atomique avec l'écriture métier) et la signature n'apparaît que sur le réseau —
    // où elle est la seule preuve d'origine acceptée à la réception.
    //
    // PUSH PAR LOTS DE 20 (mission anti-crash) : JAMAIS de lecture complète de
    // l'outbox — 3746 ops chargées d'un coup = crash mémoire. On pousse petit lot
    // par petit lot ; un échec réseau (timeout, relais HS) interrompt la boucle et
    // le reste repart au prochain cycle.
    const TAILLE_LOT = 20;
    let pushed = 0;
    let held = 0;
    // DECISION D'ENTAME (scénario 1 vs 2) : une fois par cycle — pas par lot — le client
    // demande au relais SI le patron est online (API presence, repli preuve de vie).
    // Online    → direct : le push passe, l'ACK vient vite, ops acquittées (`synced`).
    // Offline   → le push passe QUAND MÊME (relais temporaire, TTL 7 j côté relais),
    //             mais la copie locale reste `sent` : elle attend l'ACK du patron.
    let ownerOnline = true;
    if (identity.role === "employee") {
      ownerOnline = await isOwnerOnline(client, identity.shopId);
      // RATTRAPAGE (scénarios 3 & 4) — AVANT le drain, du réalimentant les copies
      // `sent` sans ACK :
      //   - patron ONLINE (retour de connexion) → TOUTES les `sent` repartent, le
      //     drain de ce cycle les re-pousse (et les acquitte, cf. ci-dessous) ;
      //   - relais muet / patron absent → SEULES les `sent` plus vieilles que le TTL
      //     7 j retournent en file : le relais a déjà purgé ses copies expirées.
      //   Rien ne se supprime côté caisse : tant qu'il n'y a PAS d'ACK, l'op reste.
      const sent = await listSentOps(identity.shopId);
      if (sent.length > 0) {
        if (ownerOnline) {
          await rebateSentOps(identity.shopId);
        } else {
          await downgradeStaleSentOps(identity.shopId, SENT_TTL_MS);
        }
      }
    }
    for (;;) {
      const lot = await listPendingOpsBatch(identity.shopId, TAILLE_LOT);
      if (lot.length === 0) break;
      const signed = await signAll(lot);
      // FAN-OUT direct : le lot signé part aussi sur les canaux WebRTC ouverts
      // (LAN) — la latence passe de deux rotations relais à un aller-retour local.
      // Le push relais garde le cycle : rattrapage des pairs hors LAN, retrouvaille.
      forwardToPeers(signed);
      if (await client.push(identity.shopId, signed)) {
        if (ownerOnline) {
          await markOpsSynced(lot.map((o) => o.id));
        } else {
          // SCÉNARIO 2 : au relais mais SANS ACK — la copie reste dans l'outbox, `sent`,
          // jusqu'à l'ACK du patron (ou rattrapage 7 j → rebasculement `pending`).
          await markOpsSent(lot.map((o) => o.id));
          held += lot.length;
        }
        pushed += lot.length;
      } else {
        break; // réseau/relais en échec : on s'arrête là, pas de martelage
      }
      if (lot.length < TAILLE_LOT) break; // dernier lot
    }

    startWebRtcMesh();

    const remote = await client.pull(identity.shopId, identity.deviceId);
    console.log(
      "[pull] Opérations reçues du relais :",
      remote.length,
      "device_id :",
      identity.deviceId,
    );
    // DIAGNOSTIC (flux patron→employé) : on veut voir l'instantané ARRIVER —
    // uniquement lui, sinon chaque rotation créerait du bruit.
    for (const op of remote) {
      if (op.type === "catalogue.snapshot") {
        const pl = op.payload as { target_device_id?: string; products?: unknown[] };
        console.log(
          "[pull] Snapshot reçu :",
          op.id,
          "source :",
          op.device_id,
          "cible :",
          pl?.target_device_id || "tous",
          "produits :",
          pl?.products?.length ?? 0,
        );
      }
    }
    const foreign: SyncOp[] = [];
    let skipped = 0;

    // SIGNALISATION RTC : les ops webrtc.* n'ont rien à faire dans le dispatch
    // (aucun état métier) — elles se consomment ici, au canal.
    const signaling: SyncOp[] = remote.filter((op) => op.type.startsWith("webrtc."));
    if (signaling.length > 0) deliverSignaling(signaling);
    const remoteBusiness = remote.filter((op) => !op.type.startsWith("webrtc."));

    // Know which devices are already paired BEFORE processing announces
    const knownBefore = new Set(
      (await getDB().paired_devices.where("shop_id").equals(identity.shopId).toArray()).map(
        (d) => d.id,
      ),
    );
    for (const op of remoteBusiness) {
      if (op.device_id === identity.deviceId) {
        skipped++;
        continue;
      }
      // Une approbation qui NOUS vise ne crée pas de fiche de soi-même : seul le registre
      // des pairs est concerné par cette décision, et il ne s'y enregistre pas lui-même.
      if (op.type === "device.approve" && op.entity_id === identity.deviceId) {
        skipped++;
        continue;
      }
      // Une annonce N'EST PAS interceptée ici : elle part dans `foreign` comme les
      // autres ops, et `applyOp` la traite. Intercepter ici (ancien
      // `handleDeviceAnnounce`, supprimé) créait un second chemin de décision, et surtout une
      // annonce consommée localement n'arrivait jamais à `applyRemoteOps` — donc la clé
      // publique du pair n'était jamais PINsée, et toutes ses ops suivantes se
      // faisaient refuser. Une seule porte : `applyOp`.
      foreign.push(op);
    }

    // Import « stock du propriétaire » demandé par un écran du groupe : le membre principal
    // répond avec LE sous-catalogue choisi pour cet écran (`shared_product_ids` /
    // `share_mode` de sa fiche), jamais avec le catalogue entier. On ne répond qu'aux
    // demandes PAS ENCORE consommées (`processed_ops`) : `foreign` contient toutes les ops
    // du relais, y compris celles rejouées aux cycles précédents.
    //
    // `requester_id` est la clé : c'est lui qui dit à qui on parle. Plusieurs employés
    // peuvent demander au même cycle — chacun reçoit le sien.
    const demandes = foreign.filter((op) => op.type === "catalogue.request");
    const dejaVues = await Promise.all(demandes.map((op) => getDB().processed_ops.get(op.id)));
    const fresh = demandes.filter((_, i) => !dejaVues[i]);

    // Ops d'approbation fraîchement appliquées : l'appareil vient d'être promu "paired"
    // et doit recevoir son stock IMMÉDIATEMENT, sans attendre le throttle des snapshots.
    const approveOps = foreign.filter((op) => op.type === "device.approve");
    const freshApproves: string[] = [];
    for (const op of approveOps) {
      if (!(await getDB().processed_ops.get(op.id))) {
        freshApproves.push((op.payload as DeviceApprovePayload).org_device_id);
      }
    }

    // Départs fraîchement appliqués : l'écran qui part rend sa PLACE au compte. Le
    // quota de l'orchestrateur compte les écrans du compte — sans cette libération,
    // un commerce qui a eu un employé ne peut plus en recrouver un autre. L'appel est
    // ici (et pas dans le handler) parce qu'il touche le réseau : un `await` de fetch
    // au milieu d'une transaction Dexie la ferait committer sous les pieds de l'appelant.
    const leaveOps = foreign.filter((op) => op.type === "device.leave");
    for (const op of leaveOps) {
      if (await getDB().processed_ops.get(op.id)) continue;
      const serverDeviceId = (op.payload as DeviceLeavePayload | undefined)?.server_device_id;
      if (!serverDeviceId) continue;
      const res = await releaseSeat(serverDeviceId);
      if (!res.ok) {
        console.warn(`[exchangeOps] place non rendue pour ${serverDeviceId} : ${res.error}`);
      }
    }

    const { applied } = await applyRemoteOps(foreign);

    // Diagnostic APRÈS la transaction Dexie : logger depuis `applyCatalogueSnapshot`
    // (appelé dans cette transaction) peut provoquer un commit prématuré. La décision
    // de ciblage est répétée ici, hors transaction, et `processed_ops` confirme la fin.
    for (const op of foreign) {
      if (op.type !== "catalogue.snapshot") continue;
      const pl = op.payload as { target_device_id?: string; products?: { id?: string }[] };
      const target = String(pl?.target_device_id ?? "")
        .trim()
        .toLowerCase();
      const current = String(identity.deviceId ?? "")
        .trim()
        .toLowerCase();
      const matches = !target || target === current;
      const processed = Boolean(await getDB().processed_ops.get(op.id));
      const source = await getDB().paired_devices.get(op.device_id);
      console.log(
        "[apply] Snapshot diagnostic :",
        matches
          ? processed
            ? "appliqué/déjà traité"
            : "cible OK, non traité (vérifier confiance/signature)"
          : "cible différente",
        "cible :",
        pl?.target_device_id ?? "tous",
        "appareil :",
        identity.deviceId,
        "produits :",
        pl?.products?.filter((p) => p?.id).length ?? 0,
        "signature :",
        Boolean(op.sig),
        "source connue :",
        Boolean(source),
        "clé source :",
        Boolean(source?.public_key),
        "op traitée :",
        processed,
        op.id,
      );
    }

    // Nouvelle arrivée au groupe : elle a droit à son stock, mais celui qu'on lui a choisi.
    const peers = await pairedEmployees(identity.shopId);
    const cibles: string[] = [];

    if (identity.role !== "employee") {
      // Le propriétaire re-annonce sa présence AVEC le code du nouveau venu : le pair
      // pour qui notre première annonce est arrivée trop tôt (avant qu'il rejoigne le
      // groupe) ne peut pas vérifier nos ops — son groupe était déjà peuplé à la
      // réception, donc la clé publique n'a jamais été épinglée chez lui. Le code de
      // paire qu'il VIENT de ressaisir est la preuve qu'il détient (fenêtre de 12 h) :
      // dans une contre-annonce, il fait épingler notre clé chez lui, et accepter
      // ensuite TOUTES nos ops, `product.created` en tête.
      const codes = new Set<string>();
      for (const op of foreign) {
        if (op.type !== "device.announce" || knownBefore.has(op.entity_id)) continue;
        const code = (op.payload as DeviceAnnouncePayload | undefined)?.pair_code;
        if (code) codes.add(code);
      }
      for (const code of codes) {
        await announceDevice(code, { force: true });
      }
      if (codes.size > 0) await pousserOutbox(client, identity.shopId);

      for (const demande of fresh) {
        const id = (demande.payload as CatalogueRequestPayload | undefined)?.requester_id;
        if (id && !cibles.includes(id)) cibles.push(id);
      }
      // L'appairage ne transfère aucun stock automatiquement. Le propriétaire choisit
      // explicitement « Transférer du stock » ; les catalogue.request confirmées plus
      // bas restent une action explicite du propriétaire, distincte du scan/approval.
      // Demandes d'import fraîches (catalogue.request) : on les enregistre en attente
      // de confirmation du propriétaire. L'UI affichera une boîte de confirmation.
      for (const deviceId of cibles) {
        const demande = fresh.find(
          (d) => (d.payload as CatalogueRequestPayload).requester_id === deviceId,
        );
        if (demande) {
          await addCatalogueRequest({
            id: demande.id,
            shop_id: identity.shopId,
            requester_id: deviceId,
            created_at: Date.now(),
          });
          // Notifie l'UI pour afficher la boîte de confirmation
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("catalogue-request-pending", {
                detail: { requester_id: deviceId, shop_id: identity.shopId },
              }),
            );
          }
        }
      }
    } else {
      // À l'approbation, pousser les opérations locales déjà en attente (annonce/profil),
      // mais ne pas déclencher un transfert de catalogue : seul le bouton manuel le fait.
      if (freshApproves.length > 0) {
        const pendingNow = await listPendingOps(identity.shopId);
        if (pendingNow.length > 0) {
          const signed = await signAll(pendingNow);
          await client.push(identity.shopId, signed);
          await markOpsSynced(pendingNow.map((o) => o.id));
        }
      }
      const last = Number((await db.settings.get(KEY_LAST_SNAPSHOT))?.value ?? 0);
      if (cibles.length > 0 && Date.now() - last >= SNAPSHOT_THROTTLE_MS) {
        for (const cible of cibles) {
          const peer = peers.find((p) => p.id === cible);
          if (!peer) continue;
          await emitShareOps(peer);
        }
        await db.settings.put({ key: KEY_LAST_SNAPSHOT, value: Date.now() });
      }
    }
    // Demandes d'import confirmées par le propriétaire : envoyer le snapshot maintenant.
    const confirmedRequests = await listPendingCatalogueRequests(identity.shopId);
    const confirmed = confirmedRequests.filter((r) => r.status === "confirmed" && !r.snapshot_sent);
    for (const req of confirmed) {
      const peer = peers.find((p) => p.id === req.requester_id);
      if (peer) {
        await emitShareOps(peer);
        await markCatalogueRequestSnapshotSent(req.id);
      }
    }
    // Toujours republier le catalogue frais si le propriétaire a de nouveaux produits/stocks
    if (identity.role !== "employee") {
      await publishFreshCatalog(client, identity);
    }
    return { pushed, applied, skipped, remote: foreign.length, held };
  } finally {
    release();
  }
}
