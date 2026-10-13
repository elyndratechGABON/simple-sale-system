import { getShopProfile, markShopSynced } from "@/lib/db";
import { handshake, syncData } from "@/lib/gatekeeper";
import { blessPendingPeers } from "./bless";
import { runOpsExchange, SYNC_REFRESH_MS } from "./ops";
import { buildLightPayload } from "./payload";

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
