// Transport des opérations entre appareils — le relais PC Master comme rendez-vous.
//
// Contrat du relais (simple-sale-orchestrateur, dépôt Séparé — PAS implémenté ici) :
//   POST /api/v1/ops  { shop_id, ops: SyncOp[] }    → stocke. Idempotent par `id` : un
//                                                     appareil qui re-pousse les mêmes ops
//                                                     (échec d'acquittement local) ne fait
//                                                     pas de doublon.
//   GET  /api/v1/ops?shop_id=…&device_id=…          → { ops: SyncOp[] } : TOUTES les ops du
//                                                     groupe, y compris celles de l'appelant.
//                                                     `device_id` = l'appareil QUI TIRE : le
//                                                     relais trace la fraîcheur par appareil
//                                                     et ne libère jamais de place tant
//                                                     qu'un appareil présent n'a pas tiré.
// En production le relais exige le secret `x-ops-token` (VITE_OPS_TOKEN à l'emploi) ; un
// relais sans jeton configuré (dev, orchestrateur historique) reste ouvert.
//
// Le relais ne connait pas les ops : il les stocke et les rend sans les interpréter, sans
// les agréger, sans les trier. « Internet sert à se rencontrer, pas à être la base de
// données ». L'appareil, lui, filtre ses propres ops au pull et déduplique par
// `processed_ops` — l'ordre d'application reste local et déterministe.
//
// Règle d'or offline-first : RIEN ici ne jette. Push en échec (hors ligne, 5xx, absence de
// l'endpoint) → outbox conservée, l'appareil réessaiera au prochain tick. Pull en échec →
// on n'applique rien. Un relais muet n'a aucun effet sur la caisse.
import { syncSemaphore } from "./semaphore";
import { applyRemoteOps } from "./apply";
import { isSharedGroup, getIdentity } from "./identity";
import { emitOp, signAll } from "./ops";
import { listPendingOps, markOpsSynced } from "./outbox";
import { getDB, listProducts } from "../db";
import { getPreferences } from "../settings";
import { getPairingToken } from "./pairing"; // Nouveau jeton pour l'appairage
import { emitShareOps, markSharePublished, pairedEmployees } from "./sharing";
import type {
  CatalogueRequestPayload,
  DeviceAnnouncePayload,
  SyncIdentity,
  SyncOp,
  PairedDevice,
} from "./types";

/** Une caisse qui importe le stock propriétaire ne doit pas faire répondre le propriétaire
 *  plus d'une fois par fenêtre : le relais rend la dernière op de toute façon, un rebouclage
 *  d'instantanés serait du bruit inutile. */
const SNAPSHOT_THROTTLE_MS = 20_000;

const KEY_LAST_SNAPSHOT = "syncengine_last_snapshot_at";

/** Publication continue du catalogue : le propriétaire maintient pour CHAQUE écran employé
 *  un instantané ABSOLU au relais — à chaque changement de son catalogue (création, vente,
 *  réappro, réception de la vente d'un employé qui modifie son stock). Ainsi « Importer le
 *  stock du propriétaire » n'attend plus le propriétaire : l'instantané est déjà au relais,
 *  le tir suffit. Deux garde-fous : la signature du catalogue (ne re-publier que si quelque
 *  chose a changé) et le délai par écran (pas une rafale pendant une fermeture de caisse). */
export const KEY_LAST_CATALOG_SIG = "syncengine_last_catalog_sig";

/** La bouche d'entrée/sortie d'un canal d'échange. Remplaçable inconditionnellement. */
export interface TransportClient {
  /** Pousse les ops locales vers le relais. `true` = le relais les a reçues. */
  push(shopId: string, ops: SyncOp[]): Promise<boolean>;
  /** Tire toutes les ops du groupe — y compris les siennes. `deviceId` identifie
   *  l'appareil qui tire : le relais suit la fraîcheur par appareil (purge sûre). */
  pull(shopId: string, deviceId: string): Promise<SyncOp[]>;
}

/** Bilan d'un cycle d'échange, pour l'UI (indicateur de sync) et les tests. */
export interface SyncState {
  /** Ops locales acquittées auprès du relais (sorties de l'outbox). */
  pushed: number;
  /** Ops étrangères nouvelles appliquées. */
  applied: number;
  /** Ops déjà connues (les siennes, ou déjà consumées par `processed_ops`) — données, pas rejouées. */
  skipped: number;
  /** Ops étrangères présentes chez le relais (dont celles déjà appliquées). */
  remote: number;
}

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
    const { applied } = await applyRemoteOps(foreign);

    // Nouvelle arrivée au groupe : elle a droit à son stock, mais celui qu'on lui a choisi.
    if (identity.role !== "employee") {
      const db = getDB();
      const peers = await pairedEmployees(identity.shopId);
      const cibles: string[] = [];
      for (const demande of fresh) {
        const id = (demande.payload as CatalogueRequestPayload | undefined)?.requester_id;
        if (id && !cibles.includes(id)) cibles.push(id);
      }
      if (newcomerAnnounced) {
        // L'op d'annonce est dans `foreign` : le nouveau pair est donc déjà enregistré.
        for (const peer of peers) if (!cibles.includes(peer.id)) cibles.push(peer.id);
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

/** Signature stable du catalogue local : les champs qui suffisent à décider « le stock
 *  (et le catalogue) des autres a-t-il changé ? » — pas la photo (binaire, locale). */
async function catalogSignature(): Promise<string> {
  const products = (await listProducts())
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      price: p.price,
      category: p.category,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify(products);
}

/** Republie, pour CHAQUE écran employé, le sous-catalogue que le propriétaire lui a
 *  choisi — et lui seulement. Avant, un changement de catalogue repartait en un instantané
 *  que TOUT le groupe appliquait : un employé ne pouvait donc pas être privé d'un article.
 *  `emitShareOps` ne sort que si le sous-catalogue de ce pair a changé depuis son dernier
 *  envoi RÉUSSI, et la signature n'est mémorisée qu'après le push (un échec n'enferme pas
 *  le relais sur un catalogue périmé). Pousse sur-le-champ (mini-push de fin de rotation)
 *  pour que le relais la détienne dès ce cycle. */
async function publishFreshCatalog(client: TransportClient, identity: SyncIdentity): Promise<void> {
  if (identity.role === "employee") return;
  const db = getDB();
  const sig = await catalogSignature();
  // Catalogue vide → rien à redistribuer, et aucune trace : un republier avec zéro produit
  // n'apporterait que du bruit au relais (et ferait « voir » un appareil sans catalogue).
  if (!sig || sig === "[]") return;
  const lastSig = await db.settings.get(KEY_LAST_CATALOG_SIG);
  // Catalogue inchangé : inutile de calculer une part par employé.
  if (lastSig?.value === sig) return;

  // Une seule passe : on prépare les parts à envoyer, puis on ne pousse que si au moins
  // un écran a effectivement changé de sous-catalogue. Le délai anti-spam est celui du
  // PAIR (`shared_published_at`) : un délai global bloquerait la publication même quand la
  // part d'UN employé vient de changer — précisément le cas qu'on veut voir passer.
  const peers = await pairedEmployees(identity.shopId);
  const parts: { peerId: string; signature: string; at: number }[] = [];
  for (const peer of peers) {
    const part = await emitShareOps(peer);
    if (part) parts.push({ peerId: peer.id, signature: part.signature, at: part.at });
  }
  if (parts.length === 0) return;

  const pending = await listPendingOps(identity.shopId);
  if (pending.length > 0) {
    const signed = await signAll(pending);
    if (await client.push(identity.shopId, signed)) {
      await markOpsSynced(pending.map((o) => o.id));
      await db.settings.put({ key: KEY_LAST_CATALOG_SIG, value: sig });
      for (const part of parts) await markSharePublished(part.peerId, part.signature, part.at);
    }
  }
}

/**
 * Un écran demande l'instantané FRIS du catalogue du groupe : l'import du stock du
 *  propriétaire de son côté (« Importer le stock du propriétaire »). Article jetable —
 *  même `entity_id` (deviceId demandeur) — transporté par le relais, jamais l'orchestrateur ;
 *  le principal répond à son prochain cycle d'échange (20 s). */
export async function emitCatalogRequest(identity: SyncIdentity): Promise<void> {
  const db = getDB();
  const payload: CatalogueRequestPayload = { requester_id: identity.deviceId };
  await db.transaction("rw", db.sync_ops, db.settings, async () => {
    await emitOp(db, identity, {
      type: "catalogue.request",
      entity_id: identity.deviceId,
      payload,
    });
  });
}

/** Le meilleur nom de boutique disponible : `prefs.workspaceName` (enseigne validée à
 *  l'onboarding) devant la fiche profil — la fiche a pu rester sur le fallback « Ma boutique »
 *  si l'onboarding ne l'avait jamais écrite. Une fiche née avec le fallback n'est pas un nom. */
async function snapshotShopName(): Promise<string | undefined> {
  const db = getDB();
  const profile = await db.shop_profiles.get("me");
  const prefs = getPreferences();
  for (const name of [prefs.workspaceName, profile?.storeName]) {
    const trimmed = name?.trim();
    if (trimmed && trimmed !== "Ma boutique") return trimmed;
  }
  return undefined;
}

/** Adaptateur du relais PC Master en HTTP. `fetchImpl` injectable pour les tests.
 *  Échec = `false` / `[]`, jamais de throw — le relais est un accessoire, pas un goulot.
 *  Un time-out annule la requête : un réseau à moitié ouvert ne doit pas laisser la
 *  promesse de synchro pendre indéfiniment. */
const FETCH_TIMEOUT_MS = 10_000;

export function relayTransport(
  baseUrl: string,
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch,
  opsToken = "",
): TransportClient {
  const authHeaders: Record<string, string> = opsToken ? { "x-ops-token": opsToken } : {};
  const timedFetch: typeof fetchImpl = async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } catch (error) {
      // Une annulation volontaire se signale comme un AbortError — neutralisable comme
      // toute erreur réseau : le relais est muet pour la caisse.
      if (error instanceof DOMException && error.name === "AbortError") {
        return new Response(null, { status: 408 });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
  return {
    async push(shopId: string, ops: SyncOp[]): Promise<boolean> {
      if (ops.length === 0) return true;
      try {
        const res = await timedFetch(`${baseUrl}/api/v1/ops`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ shop_id: shopId, ops }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    async pull(shopId: string, deviceId: string): Promise<SyncOp[]> {
      try {
        const res = await timedFetch(
          `${baseUrl}/api/v1/ops?shop_id=${encodeURIComponent(shopId)}` +
            `&device_id=${encodeURIComponent(deviceId)}`,
          { headers: authHeaders },
        );
        if (!res.ok) return [];
        const data = (await res.json().catch(() => null)) as { ops?: SyncOp[] } | null;
        return Array.isArray(data?.ops) ? data.ops : [];
      } catch {
        return [];
      }
    },
  };
}
