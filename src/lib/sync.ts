// SNIPPET ORCHESTRATEUR — le point de branchement de l'app vers la plateforme.
//
// Avant de déployer une app, un seul réglage est nécessaire : l'adresse de l'orchestrateur.
// Par défaut c'est le domaine même de l'app (`window.location.origin`) — l'orchestrateur est
// servi par le même projet Vercel (`/api/*`) — donc rien à configurer pour une app déployée
// sur le domaine enregistré. Une app tierce sur un autre domaine passe par
// VITE_ORCHESTRATOR_URL. L'orchestrateur identifie le projet grâce au domaine envoyé
// (`project_domain`) : c'est le domaine qu'on enregistre dans sa console.
//
// Rien ici ne doit jamais bloquer l'application : hors ligne, serveur injoignable ou domaine
// non enregistré, on échoue en silence et on réessaiera au prochain démarrage ou au prochain
// retour en ligne. C'est le flux voulu — la caisse est un outil offline-first.
//
// Le protocole réel vit dans src/lib/gatekeeper.ts (handshake → commandes → sync-data).
// Ce module orchestre l'appel périodique et construit le payload d'agrégats. Depuis le moteur
// P2P, un SECOND canal y est branché : l'échange d'opérations entre appareils du même compte
// (`syncengine/transport.ts`, relais `/api/v1/ops`). Il est DÉCOUPLÉ du handshake : la
// convergence stock/ventes se fait même quand l'orchestrateur est injoignable (ex. employé
// hors du réseau du comptoir) — et sans jamais faire tomber la caisse. L'adresse de ce relais
// est DÉCOUPLÉE de l'orchestrateur
// (`getOpsRelayUrl`, via `VITE_OPS_URL`) : le relais peut être hébergé ailleurs et rester
// allumé indépendamment (ex. Neon + Fonction Vercel).
import {
  getDB,
  getSaleItemsForSales,
  getShopProfile,
  listProducts,
  listSales,
  markShopSynced,
} from "@/lib/db";
import { computePeriodStats, lastDaysRange } from "@/lib/analytics";
import { blessEmployeeDevice, handshake, syncData, type HandshakeResult } from "@/lib/gatekeeper";
import { ensureIdentity, isSharedGroup } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { purgeSyncedOps } from "@/lib/syncengine/outbox";
import { exchangeOps, relayTransport, type SyncState } from "@/lib/syncengine/transport";

/** Adresse de l'orchestrateur. Compilée au build via VITE_ORCHESTRATOR_URL, sinon le domaine de l'app. */
export function getOrchestratorUrl(): string {
  const override = (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined)?.trim();
  return override || PROJECT_DOMAIN;
}

/**
 * Adresse du RELAIS d'échange d'opérations (canal P2P). Découplée de l'orchestrateur :
 * le relais peut être hébergé ailleurs (ex. Neon/Fonction Vercel) et rester allumé
 * indépendamment de la machine. Compilée au build via VITE_OPS_URL ; en l'absence de
 * cette variable, le canal ops retombe sur l'orchestrateur historique `/api/v1/ops`.
 */
export function getOpsRelayUrl(): string {
  const override = (import.meta.env.VITE_OPS_URL as string | undefined)?.trim();
  return override || getOrchestratorUrl();
}

/**
 * Jeton du relais ops (header `x-ops-token`), compilation embarquée via VITE_OPS_TOKEN.
 * Vide en l'absence de variable → la caisse parle à un relais ouvert (dev ou orchestrateur
 * historique qui n'exige rien). En production, le relais Vercel exige ce jeton : sans lui,
 * push/pull répondent 401 et l'échange reste silencieusement en retrait (jamais bloquant).
 */
export function getOpsToken(): string {
  return (import.meta.env.VITE_OPS_TOKEN as string | undefined)?.trim() || "";
}

const PROJECT_DOMAIN = typeof window !== "undefined" ? window.location.origin : "";

// Tolérance d'arrière-plan : la caisse sonne (handshake) toutes les minutes — c'est ce
// qui récupère vite une suspension ou un message — mais ne pousse les agrégats qu'au
// plus toutes les cinq minutes une fois la première synchronisation faite.
const SYNC_INTERVAL_MS = 60_000;
const SYNC_REFRESH_MS = 5 * 60_000;

/**
 * Ratissage des écrans approuvés non encore rattachés au compte côté serveur (`/account/bless`).
 * Best-effort : ne doit JAMAIS échouer la synchro.  L'appel est déclenché par la synchro
 * d'arrière-plan ET par le « synchroniser » ; il ne tourne que pour le rôle `owner` (seul le
 * propriétaire possède les identifiants du compte pour authentifier l'appel).
 */
async function blessPendingPeers(): Promise<void> {
  try {
    const identity = await ensureIdentity();
    if (identity.role !== "owner") return;
    const peers = await listPairedDevices(identity.shopId);
    const db = getDB();
    for (const peer of peers) {
      if (peer.status !== "paired" || peer.blessed_at || !peer.server_device_id) continue;
      const res = await blessEmployeeDevice(peer.server_device_id);
      if (res.ok) await db.paired_devices.update(peer.id, { blessed_at: Date.now() });
    }
  } catch {
    /* silencieux — prochain cycle */
  }
}

// Rétention des ops ACQUITTÉES côté local (outbox `synced`) : 30 jours. Au-delà, si le
// relais redélivre une op purgée, `processed_ops` la saute — $0 perte. Les pendantes
// (push en échec) ne sont jamais purgées ici.
const OPS_TTL_MS = 30 * 86400_000;

/**
 * Échange d'opérations entre appareils du même compte (canal P2P via le relais).
 * DÉCOUPLÉ du handshake : il tourne même quand l'orchestrateur est injoignable (employé
 * hors du Wi-Fi du comptoir) — le relais est public, la « rencontre » se fait par lui.
 * Jamais bloquant : l'échec du relais ne fait pas tomber la rotation — l'outbox reste en
 * attente et repartira au prochain tick. Renvoie l'état pour que l'UI sache si des données
 * ont convergé (rafraîchissement des écrans sans attendre la manœuvre).
 */
async function runOpsExchange(): Promise<SyncState | null> {
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) return null; // caisse jamais inscrite → rien à partager
  const url = getOpsRelayUrl();
  if (!url) return null;
  try {
    const state = await exchangeOps(relayTransport(url, fetch, getOpsToken()));
    // Le TTL s'applique à chaque rotation réussie — paresseux, donc gratuit.
    await purgeSyncedOps(OPS_TTL_MS);
    return state;
  } catch {
    // L'échange est un plus, jamais un goulot.
    return null;
  }
}

/** Agrégats LÉGERS des 7 derniers jours — pas de dump d'IndexedDB, pas de données sensibles. */
async function buildLightPayload() {
  const { from, to } = lastDaysRange(7);
  const sales = await listSales(from, to);
  const items = await getSaleItemsForSales(sales.map((s) => s.id));
  const stats = computePeriodStats(sales, items, from, to);
  return {
    generated_at: Date.now(),
    period_days: 7,
    totals: {
      revenue: stats.revenue,
      profit: stats.profit,
      sales: stats.salesCount,
      items: stats.itemsCount,
      customers: stats.customersCount,
    },
    by_day: stats.days.map((d) => ({
      day: d.day,
      revenue: d.revenue,
      profit: d.profit,
      sales: d.salesCount,
    })),
    top_products: stats.topProducts.slice(0, 5).map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
    })),
  };
}

/**
 * Synchronisation d'arrière-plan — appelée au démarrage, au retour en ligne et toutes les
 * minutes tant que l'application est ouverte.
 *
 * 1. Échange d'opérations P2P d'abord, sur le relais (canal DÉCOUPLÉ de l'orchestrateur) :
 *    il tourne même si le handshake échoue — un écran employé hors du Wi-Fi du comptoir
 *    doit quand même recevoir le stock et renvoyer ses ventes. Le relais étant public,
 *    c'est lui qui garantit la « rencontre » peu importe la distance.
 * 2. Handshake à CHAQUE tick : ordres (suspend/renew/message) appliqués sans délai,
 *    échéance alignée sur celle que le serveur renvoie.
 * 3. Si le serveur autorise la sync (« active ») et que le dernier envoi date de plus de
 *    cinq minutes, les agrégats partent. Throttlé, et c'est délibéré : inutile de
 *    marteler le serveur.
 */
export async function backgroundSync(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const profile = await getShopProfile();
  if (!profile) return false;

  const ops = await runOpsExchange();
  const changed = Boolean(ops && (ops.pushed > 0 || ops.applied > 0));

  const result = await handshake();
  if (!result.ok) return changed;

  // Rattacher les écrans approuvés au compte marchand dès que l'orchestrateur répond (best-effort).
  await blessPendingPeers();

  if (
    result.sync_allowed &&
    (!profile.lastSyncedAt || Date.now() - profile.lastSyncedAt >= SYNC_REFRESH_MS)
  ) {
    const payload = await buildLightPayload();
    if (await syncData(payload)) await markShopSynced(Date.now());
  }
  return changed;
}

export { SYNC_INTERVAL_MS };

/**
 * Synchronisation MANUELLE (bouton « Synchroniser ») : échange ops (relais) puis
 * handshake immédiat ; si le compte est actif, envoi des agrégats. Sans throttle —
 * l'utilisateur a demandé une vérification, on la fait.
 */
export async function syncNow(): Promise<HandshakeResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, sync_allowed: false, status: "unknown", reason: "network" };
  }
  await runOpsExchange();
  const result = await handshake();
  if (!result.ok) return result;
  if (result.sync_allowed) {
    const payload = await buildLightPayload();
    if (await syncData(payload)) await markShopSynced(Date.now());
  }
  await blessPendingPeers();
  return result;
}

/**
 * Import MANUEL du catalogue propriétaire (bouton « Importer le stock du propriétaire »
 * sur l'écran employé) : force le cycle d'échange du groupe — pull des ops du relais
 * (instantané catalogue, créations/MAJ produits) et application — puis compte les
 * produits présents en caisse. Rien de plus que ce que fait la synchro d'arrière-plan,
 * mais immédiat et avec un retour pour l'UI.
 */
export async function importOwnerCatalog(): Promise<{
  ok: boolean;
  applied: number;
  count: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, applied: 0, count: 0 };
  }
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) {
    return { ok: false, applied: 0, count: 0 };
  }
  const state = await runOpsExchange();
  const count = (await listProducts()).length;
  return { ok: state !== null, applied: state?.applied ?? 0, count };
}
