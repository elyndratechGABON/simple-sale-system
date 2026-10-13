import { syncSemaphore } from "../semaphore";
import { applyRemoteOps } from "../apply";
import { isSharedGroup, getIdentity } from "../identity";
import { signAll } from "../ops";
import { listPendingOps, markOpsSynced } from "../outbox";
import {
  getDB,
  addCatalogueRequest,
  listPendingCatalogueRequests,
  markCatalogueRequestSnapshotSent,
} from "../../db";
import { emitShareOps, pairedEmployees } from "../sharing";
import type { CatalogueRequestPayload, DeviceApprovePayload, SyncOp } from "../types";
import {
  KEY_LAST_SNAPSHOT,
  SNAPSHOT_THROTTLE_MS,
  type SyncState,
  type TransportClient,
} from "./types";
import { publishFreshCatalog } from "./catalog";

/** Cycle complet d'un appareil : pousse son outbox, tire ce que les autres ont laissé,
 *  rejoue les ops étrangères. Jamais bloquant : tout est déjà protégé en amont. */
export async function exchangeOps(client: TransportClient): Promise<SyncState> {
  const release = await syncSemaphore.acquire();
  try {
    const identity = getIdentity();
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
    const pending = await listPendingOps(identity.shopId);
    let pushed = 0;
    if (pending.length > 0) {
      const signed = await signAll(pending);
      if (await client.push(identity.shopId, signed)) {
        await markOpsSynced(pending.map((o) => o.id));
        pushed = pending.length;
      }
    }

    const remote = await client.pull(identity.shopId, identity.deviceId);
    const foreign: SyncOp[] = [];
    let skipped = 0;

    // Know which devices are already paired BEFORE processing announces
    const knownBefore = new Set(
      (await getDB().paired_devices.where("shop_id").equals(identity.shopId).toArray()).map(
        (d) => d.id,
      ),
    );
    let newcomerAnnounced = false;

    for (const op of remote) {
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
      if (op.type === "device.announce" && !knownBefore.has(op.entity_id)) {
        newcomerAnnounced = true;
      }
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

    const { applied } = await applyRemoteOps(foreign);

    // Nouvelle arrivée au groupe : elle a droit à son stock, mais celui qu'on lui a choisi.
    const peers = await pairedEmployees(identity.shopId);
    const cibles: string[] = [];

    if (identity.role !== "employee") {
      for (const demande of fresh) {
        const id = (demande.payload as CatalogueRequestPayload | undefined)?.requester_id;
        if (id && !cibles.includes(id)) cibles.push(id);
      }
      if (newcomerAnnounced) {
        // L'op d'annonce est dans `foreign` : le nouveau pair est donc déjà enregistré.
        for (const peer of peers) if (!cibles.includes(peer.id)) cibles.push(peer.id);
      }
      // Appareils fraîchement approuvés : envoi IMMÉDIAT du snapshot (hors throttle).
      for (const deviceId of freshApproves) {
        const peer = peers.find((p) => p.id === deviceId);
        if (peer) await emitShareOps(peer);
      }
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
      // Les snapshots pour les nouveaux approuvés (device.approve) viennent d'être écrits
      // dans l'outbox : on les pousse TOUT DE SUITE.
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
    // Publication continue (rôle non-employé) : si le catalogue local vient de changer —
    // le nôtre ou celui que les pairs nous ont fait appliquer ci-dessus — on republie un
    // instantané ABSOLU au relais, dans la même rotation. L'écran employé qui importera son
    // stock le tirera directement, même si ce téléphone est déjà éteint.
    await publishFreshCatalog(client, identity);
    return { pushed, applied, skipped, remote: foreign.length };
  } finally {
    release();
  }
}
