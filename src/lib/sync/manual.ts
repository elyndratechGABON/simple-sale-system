import { listProducts, markShopSynced } from "@/lib/db";
import { handshake, syncData, type HandshakeResult } from "@/lib/gatekeeper";
import { ensureIdentity, isSharedGroup } from "@/lib/syncengine/identity";
import { emitCatalogRequest } from "@/lib/syncengine/transport";
import { blessPendingPeers } from "./bless";
import { runOpsExchange } from "./ops";
import { buildLightPayload } from "./payload";

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
 * Phases d'un import du stock propriétaire, pour l'animation de transfert côté UI :
 * - "relay"     → connexion au relais + émission de la demande ;
 * - "waiting"   → demande envoyée, attente de l'instantané du propriétaire ;
 * - "receiving" → des opérations arrivent (instantané en cours d'application).
 */
export type ImportPhase = "relay" | "waiting" | "receiving";

/**
 * Import MANUEL du catalogue propriétaire (bouton « Importer le stock du propriétaire »
 * sur l'écran employé). Passe PAR LE RELAIS — jamais l'orchestrateur :
 *  1. l'écran émet une demande d'instantané FRIS → le principal répond à son prochain
 *     cycle d'échange (le téléphone du propriétaire « sonne » toutes les minutes) ;
 *  2. cycles de réception : on s'arrête dès que le stock BOUGE (import initial : dès que
 *     des produits arrivent, le reste suivra par deltas). Tant que le téléphone du
 *     propriétaire n'a pas répondu, le relais n'a rien de neuf — le ré-import attend donc
 *     sa réponse (jusqu'à ~115 s : la fenêtre doit dépasser le cycle de 60 s du
 *     propriétaire) au lieu d'annoncer un « déjà à jour » qui n'a rien transféré.
 *  Le `cause` distingue l'échec pour l'UI (« offline », « orphan » = caisse sans compte,
 *  « timeout » = demande en route, réponse pas encore reçue). `progress` pilote
 *  l'animation de transfert affichée pendant l'import.
 */
export async function importOwnerCatalog(progress?: (phase: ImportPhase) => void): Promise<{
  ok: boolean;
  applied: number;
  count: number;
  cause?: "offline" | "orphan" | "timeout";
}> {
  progress?.("relay");
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, applied: 0, count: 0, cause: "offline" };
  }
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) {
    return { ok: false, applied: 0, count: 0, cause: "orphan" };
  }

  await emitCatalogRequest(identity);
  progress?.("waiting");

  const before = await stockFingerprint();
  let applied = 0;
  let count = 0;
  for (let i = 0; i < 24; i++) {
    const state = await runOpsExchange();
    if (state && state.applied > 0) progress?.("receiving");
    if (state) applied += state.applied;
    count = (await listProducts()).length;
    // Le stock est arrivé s'il est ENTRÉ (import initial) ou s'il a BOUGÉ depuis le début
    // de la manœuvre. « J'ai déjà des produits » ne prouve rien : tant que le téléphone
    // du propriétaire n'a pas poussé, le relais n'a rien de neuf à rendre, et c'est
    // exactement ce ré-import que le vendeur attend. Sortir sur ce critère seul
    // transformait le bouton en « Catalogue déjà à jour » alors que rien n'avait été
    // transféré — le stock du propriétaire n'arrivait qu'à la PREMIÈRE importation.
    if (count > 0 && (!before || (await stockFingerprint()) !== before)) break;
    if (i > 0) await sleep(5000);
  }
  if (count > 0) return { ok: true, applied, count, cause: undefined };
  return { ok: false, applied, count, cause: "timeout" };
}

/** Empreinte du stock local (`id:niveau`) : répond à « le catalogue a-t-il bougé ? ».
 *  Vide = caisse sans produit — c'est l'import initial, qui n'attend pas de mouvement. */
async function stockFingerprint(): Promise<string> {
  const products = await listProducts();
  return products.length === 0 ? "" : products.map((p) => `${p.id}:${p.stock}`).join("|");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
