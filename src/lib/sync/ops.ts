import { ensureIdentity, isSharedGroup } from "@/lib/syncengine/identity";
import { purgeSyncedOps } from "@/lib/syncengine/outbox";
import { exchangeOps, relayTransport, type SyncState } from "@/lib/syncengine/transport";
import { getOpsRelayUrl, getOpsToken } from "./url";
import { isMaintenanceOn } from "./maintenance";

// Tolérance d'arrière-plan : la caisse sonne (handshake) toutes les minutes — c'est ce
// qui récupère vite une suspension ou un message — mais ne pousse les agrégats qu'au
// plus toutes les cinq minutes une fois la première synchronisation faite.
const SYNC_INTERVAL_MS = 60_000;
const SYNC_REFRESH_MS = 5 * 60_000;

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
