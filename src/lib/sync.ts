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
// (`syncengine/transport.ts`, relais `/api/v1/ops`) — toujours après un handshake réussi, et
// sans jamais faire tomber la caisse.
import { getSaleItemsForSales, getShopProfile, listSales, markShopSynced } from "@/lib/db";
import { computePeriodStats, lastDaysRange } from "@/lib/analytics";
import { handshake, syncData, type HandshakeResult } from "@/lib/gatekeeper";
import { ensureIdentity, isSharedGroup } from "@/lib/syncengine/identity";
import { purgeSyncedOps } from "@/lib/syncengine/outbox";
import { exchangeOps, relayTransport } from "@/lib/syncengine/transport";

/** Adresse de l'orchestrateur. Compilée au build via VITE_ORCHESTRATOR_URL, sinon le domaine de l'app. */
export function getOrchestratorUrl(): string {
  const override = (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined)?.trim();
  return override || PROJECT_DOMAIN;
}

const PROJECT_DOMAIN = typeof window !== "undefined" ? window.location.origin : "";

// Tolérance d'arrière-plan : la caisse sonne (handshake) toutes les minutes — c'est ce
// qui récupère vite une suspension ou un message — mais ne pousse les agrégats qu'au
// plus toutes les cinq minutes une fois la première synchronisation faite.
const SYNC_INTERVAL_MS = 60_000;
const SYNC_REFRESH_MS = 5 * 60_000;

// Rétention des ops ACQUITTÉES côté local (outbox `synced`) : 30 jours. Au-delà, si le
// relais redélivre une op purgée, `processed_ops` la saute — $0 perte. Les pendantes
// (push en échec) ne sont jamais purgées ici.
const OPS_TTL_MS = 30 * 86400_000;

/**
 * Échange d'opérations entre appareils du même compte (canal P2P via le relais).
 * Appelé après un handshake réussi. Jamais bloquant : l'échec du relais ne fait pas
 * tomber la rotation — l'outbox reste en attente et repartira au prochain tick.
 */
async function runOpsExchange(): Promise<void> {
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) return; // caisse jamais inscrite → rien à partager
  const url = getOrchestratorUrl();
  if (!url) return;
  try {
    await exchangeOps(relayTransport(url));
    // Le TTL s'applique à chaque rotation réussie — paresseux, donc gratuit.
    await purgeSyncedOps(OPS_TTL_MS);
  } catch {
    // L'échange est un plus, jamais un goulot.
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
 * 1. Handshake à CHAQUE tick : ordres (suspend/renew/message) appliqués sans délai,
 *    échéance alignée sur celle que le serveur renvoie.
 * 2. Échange d'opérations P2P entre appareils du même compte, via le relais — chaque
 *    minute aussi : peu coûteux (outbox vide → une lecture), et c'est ce qui fait
 *    arriver une vente d'un autre écran sans attendre la manœuvre.
 * 3. Si le serveur autorise la sync (« active ») et que le dernier envoi date de plus de
 *    cinq minutes, les agrégats partent. Throttlé, et c'est délibéré : inutile de
 *    marteler le serveur.
 */
export async function backgroundSync(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const profile = await getShopProfile();
  if (!profile) return;

  const result = await handshake();
  if (!result.ok) return;

  await runOpsExchange();

  if (
    result.sync_allowed &&
    (!profile.lastSyncedAt || Date.now() - profile.lastSyncedAt >= SYNC_REFRESH_MS)
  ) {
    const payload = await buildLightPayload();
    if (await syncData(payload)) await markShopSynced(Date.now());
  }
}

export { SYNC_INTERVAL_MS };

/**
 * Synchronisation MANUELLE (bouton « Synchroniser ») : handshake immédiat puis, si le
 * compte est actif, envoi des agrégats. Sans throttle — l'utilisateur a demandé une
 * vérification, on la fait.
 */
export async function syncNow(): Promise<HandshakeResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, sync_allowed: false, status: "unknown", reason: "network" };
  }
  const result = await handshake();
  if (!result.ok) return result;
  await runOpsExchange();
  if (result.sync_allowed) {
    const payload = await buildLightPayload();
    if (await syncData(payload)) await markShopSynced(Date.now());
  }
  return result;
}
