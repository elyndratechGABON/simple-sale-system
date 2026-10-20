import { getSetting, setSetting } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { SETTING_DELETE_REQUEST } from "./settings";
import type { DeleteAccountRequest } from "./types";

export async function getDeleteAccountRequest(): Promise<DeleteAccountRequest | null> {
  return (await getSetting<DeleteAccountRequest>(SETTING_DELETE_REQUEST)) ?? null;
}

export async function clearDeleteAccountRequest(): Promise<void> {
  await setSetting(SETTING_DELETE_REQUEST, null);
}

// ── Suppression de la boutique, par la caisse elle-même ───────────────────────────
// L'endpoint public exige le `device_id` ET le nom de boutique : la caisse prouve
// qu'elle sait qui elle est. Le serveur d'abord, la purge locale ensuite : si le réseau
// manque, on échoue SANS rien effacer — on ne veut pas d'un appareil que le serveur
// croirait encore actif, qui ressusciterait au prochain handshake.
//
// Renvoie un résultat plutôt que de throw : si le serveur refuse (CORS, panne, 5xx),
// l'appelant peut quand même proposer la purge locale — un appareil bloqué par le
// serveur ne doit pas devenir inutilisable.
export async function deleteShopRemote(
  deviceId: string,
  storeName: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = getOrchestratorUrl();
  if (!url) return { ok: false, error: "Aucun serveur de synchronisation configuré." };
  try {
    const res = await fetch(`${url}/api/v1/shops/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_name: storeName }),
    });
    // Déjà supprimée côté serveur (tableau de bord) : on peut continuer la purge locale.
    if (res.status === 404) return { ok: true };
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? "Le serveur a refusé la suppression." };
    }
    return { ok: true };
  } catch (e) {
    // CORS, réseau coupé, timeout — le serveur est injoignable mais la purge locale
    // reste utile : l'utilisateur ne doit pas rester bloqué sur un serveur HS.
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Impossible de contacter le serveur.",
    };
  }
}
