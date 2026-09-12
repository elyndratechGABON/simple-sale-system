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
import { applyRemoteOps } from "./apply";
import { isSharedGroup, getIdentity } from "./identity";
import { emitOp } from "./ops";
import { listPendingOps, markOpsSynced } from "./outbox";
import { getDB, listProducts } from "../db";
import { getPreferences } from "../settings";
import type {
  CatalogueRequestPayload,
  CatalogueSnapshotPayload,
  SyncIdentity,
  SyncOp,
} from "./types";

/** Une caisse qui importe le stock propriétaire ne doit pas faire répondre le propriétaire
 *  plus d'une fois par fenêtre : le relais rend la dernière op de toute façon, un rebouclage
 *  d'instantanés serait du bruit inutile. */
const SNAPSHOT_THROTTLE_MS = 20_000;
const KEY_LAST_SNAPSHOT = "syncengine_last_snapshot_at";

/** Publication continue du catalogue : le propriétaire maintient FRIS un instantané ABSOLU
 *  au relais — à chaque changement de son catalogue (création, vente, réappro, réception de
 *  la vente d'un employé qui modifie son stock). Ainsi « Importer le stock du propriétaire »
 *  n'attend plus le propriétaire : l'instantané est déjà au relais, le tir suffit. Deux
 *  garde-fous : la signature du catalogue (ne re-publier que si quelque chose a changé) et un
 *  pas minimal (ne pas publier une centaine de fois pendant une fermeture de caisse). */
const AUTO_SNAPSHOT_MIN_INTERVAL_MS = 30_000;
export const KEY_LAST_CATALOG_SIG = "syncengine_last_catalog_sig";
export const KEY_LAST_AUTO_SNAPSHOT = "syncengine_last_auto_snapshot_at";

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
  const identity = getIdentity();
  if (!isSharedGroup(identity.shopId)) return { pushed: 0, applied: 0, skipped: 0, remote: 0 };

  const pending = await listPendingOps(identity.shopId);
  let pushed = 0;
  if (pending.length > 0 && (await client.push(identity.shopId, pending))) {
    await markOpsSynced(pending.map((o) => o.id));
    pushed = pending.length;
  }

  const remote = await client.pull(identity.shopId, identity.deviceId);
  const foreign: SyncOp[] = [];
  let skipped = 0;
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
    foreign.push(op);
  }
  // Une caisse du groupe vient de s'annoncer pour la première fois AVEC NOUS : elle est
  // neuve et partirait vide (les deltas seuls ne reconstruisent pas le catalogue d'un
  // écran sans historiques). Un membre non-employé lui renvoie alors l'instantané complet
  // des produits — stock ABSOLU courant — qu'elle prendra comme point de départ.
  const known = new Set(
    (await getDB().paired_devices.where("shop_id").equals(identity.shopId).toArray()).map(
      (d) => d.id,
    ),
  );
  const newcomerAnnounced = foreign.some(
    (op) => op.type === "device.announce" && !known.has(op.entity_id),
  );
  // Import « stock du propriétaire » demandé par un écran du groupe : le membre principal
  // répond en poussant un instantané ABSOLU du catalogue vivant (stock courant). Ne
  // réagir qu'à une demande PAS ENCORE consommée (`processed_ops`) : `foreign` contient
  // toutes les ops du relais, y compris celles déjà rejouées aux cycles précédents.
  const pendingRequests = await Promise.all(
    foreign
      .filter((op) => op.type === "catalogue.request")
      .map((op) => getDB().processed_ops.get(op.id)),
  );
  const catalogRequested = pendingRequests.some((row) => !row);
  const { applied } = await applyRemoteOps(foreign);
  if (identity.role !== "employee" && (newcomerAnnounced || catalogRequested)) {
    const db = getDB();
    const last = Number((await db.settings.get(KEY_LAST_SNAPSHOT))?.value ?? 0);
    if (Date.now() - last >= SNAPSHOT_THROTTLE_MS) {
      await emitCatalogSnapshot(identity);
      await db.settings.put({ key: KEY_LAST_SNAPSHOT, value: Date.now() });
    }
  }
  // Publication continue (rôle non-employé) : si le catalogue local vient de changer —
  // le nôtre ou celui que les pairs nous ont fait appliquer ci-dessus — on republie un
  // instantané ABSOLU au relais, dans la même rotation. L'écran employé qui importera son
  // stock le tirera directement, même si ce téléphone est déjà éteint.
  await publishFreshCatalog(client, identity);
  return { pushed, applied, skipped, remote: foreign.length };
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

/** Republie l'instantané FRIS du catalogue si (1) il a changé depuis la dernière
 *  publication ET (2) la fenêtre minimale est passée. Pousse l'op sur-le-champ (mini-push
 *  de fin de rotation) pour que le relais la détienne dès ce cycle — le prochain « importer »
 *  de l'employé la tirera. La signature n'est mémorisée qu'après un push RÉUSSI : un échec
 *  n'emprisonne jamais le relais dans un catalogue périmé. */
async function publishFreshCatalog(client: TransportClient, identity: SyncIdentity): Promise<void> {
  if (identity.role === "employee") return;
  const db = getDB();
  const now = Date.now();
  const sig = await catalogSignature();
  // Catalogue vide → rien à redistribuer, et aucune trace : un republier avec zéro produit
  // n'apporterait que du bruit au relais (et ferait « voir » un appareil sans catalogue).
  if (!sig || sig === "[]") return;
  const [lastSig, lastAt] = await Promise.all([
    db.settings.get(KEY_LAST_CATALOG_SIG),
    db.settings.get(KEY_LAST_AUTO_SNAPSHOT),
  ]);
  if (lastSig?.value === sig) return;
  if (now - Number(lastAt?.value ?? 0) < AUTO_SNAPSHOT_MIN_INTERVAL_MS) return;
  await emitCatalogSnapshot(identity);
  const pending = await listPendingOps(identity.shopId);
  if (pending.length > 0 && (await client.push(identity.shopId, pending))) {
    await markOpsSynced(pending.map((o) => o.id));
    await db.settings.put({ key: KEY_LAST_CATALOG_SIG, value: sig });
    await db.settings.put({ key: KEY_LAST_AUTO_SNAPSHOT, value: now });
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

/** Instantané du catalogue vivant, émis pour un écran qui vient de rejoindre le groupe. */
async function emitCatalogSnapshot(identity: SyncIdentity): Promise<void> {
  const db = getDB();
  // Photo exclue : c'est du binaire dataURL lourd, la doc la garde LOCALE (cf. db.ts) —
  // le relais ne transporte que de la donnée légère.
  const products = (await listProducts()).map(({ photo: _photo, ...p }) => p);
  const shopName = await snapshotShopName();
  const payload: CatalogueSnapshotPayload = {
    products,
    ...(shopName ? { shop: { storeName: shopName } } : {}),
  };
  await db.transaction("rw", db.sync_ops, db.settings, async () => {
    await emitOp(db, identity, {
      type: "catalogue.snapshot",
      entity_id: "catalog",
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
