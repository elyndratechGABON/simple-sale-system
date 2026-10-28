import { ensureIdentity, isSharedGroup } from "@/lib/syncengine/identity";
import { purgeSyncedOps, listPendingOps } from "@/lib/syncengine/outbox";
import { exchangeOps, relayTransport, type SyncState } from "@/lib/syncengine/transport";
import { getOpsRelayUrl, getOpsToken } from "./url";
import { isMaintenanceOn } from "./maintenance";

// Tolérance d'arrière-plan : la caisse sonne (handshake) toutes les minutes — c'est ce
// qui récupère vite une suspension ou un message — mais ne pousse les agrégats qu'au
// plus toutes les cinq minutes une fois la première synchronisation faite.
const SYNC_INTERVAL_MS = 60_000;
const SYNC_REFRESH_MS = 5 * 60_000;

/** VOIE RAPIDE — ops critiques (stock, ventes, réservations) : le relais est sondé
 *  à chaque SECONDE tant qu'une op critique attend, au lieu d'attendre la minute.
 *  Le tick 1 s ne pousse QUE si nécessaire : hors file critique, coût zéro. */
export const CRITICAL_INTERVAL_MS = 1_000;

/** Op types dont la DESTINATION rapide n'attend pas la minute. */
const CRITICAL_OPS: string[] = [
  "sale.created",
  "sale.cancelled",
  "stock.adjusted",
  "stock.reserve",
  "stock.release",
  "stock.conflict",
];

export { SYNC_INTERVAL_MS, SYNC_REFRESH_MS };

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
export async function runOpsExchange(): Promise<SyncState | null> {
  // Vitest charge `.env.local` : sans ce garde, un test qui déclencherait l'échange pousserait
  // de VRAIES ops (signées, avec le vrai jeton) sur le relais de production. Les tests
  // qui veulent un transport injectent `exchangeOps(makeRelay().client)` directement.
  if (import.meta.env.VITEST) return null;
  // MODE MAINTENANCE : les caisses cessent de pousser/tirer leurs opérations. Elles
  // encassent toujours (hors ligne d'abord) ; leurs opérations restent en file et
  // repartiront à la levée du mode.
  if (await isMaintenanceOn()) return null;
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

let lastFastRun = 0;
let fastRunning = false;

/**
 * VOIE RAPIDE : l'intervalle de polling critique (ops de stock / ventes /
 * réservations) passe de la minute à 1 SECONDE tant qu'une op critique attend
 * dans l'outbox. Une op non critique seule ne déclenche RIEN — la minute
 * normale s'en chargera.
 */
export async function runCriticalOpsExchange(): Promise<SyncState | null> {
  if (import.meta.env.VITEST) return null;
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  if (fastRunning) return null;
  // Anti-martelage : deux voies rapides jamais espacées de moins d'une seconde.
  if (Date.now() - lastFastRun < 900) return null;
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) return null;
  const pending = await listPendingOps(identity.shopId);
  if (!pending.some((op) => CRITICAL_OPS.includes(op.type))) return null;
  fastRunning = true;
  lastFastRun = Date.now();
  try {
    return await runOpsExchange();
  } finally {
    fastRunning = false;
  }
}
