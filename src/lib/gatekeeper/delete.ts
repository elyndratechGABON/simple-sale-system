import { getSetting, getShopProfile, setSetting } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { SETTING_DELETE_PENDING, SETTING_DELETE_REQUEST } from "./settings";
import type { DeleteAccountRequest, ShopDeletionRequestResult } from "./types";

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

// ── Demande de suppression soumise par l'EMPLOYÉ (chemin principal) ───────────────
// Le vendeur cliquait « Supprimer mon compte » : on ne supprime RIEN d'office. Une
// demande part à l'orchestrateur (`POST /shops/:device_id/delete-request`), que le
// propriétaire tranche dans son tableau de bord (approuver → la commande
// `delete_account_request` revient au handshake et l'employé CONSENT ; refuser → la
// commande affiche juste le refus). Offline-first : si le serveur est injoignable, la
// demande est persistée et rejouée au prochain handshake réussi (`flushPendingDeleteRequest`).
export async function requestShopDeletion(reason?: string): Promise<ShopDeletionRequestResult> {
  const profile = await getShopProfile();
  if (!profile)
    return { submitted: false, pending: false, error: "Aucune boutique sur cet appareil." };
  const url = getOrchestratorUrl();
  if (!url)
    return {
      submitted: false,
      pending: false,
      error: "Aucun serveur de synchronisation configuré.",
    };
  try {
    const res = await fetch(
      `${url}/api/v1/shops/${encodeURIComponent(profile.deviceId)}/delete-request`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: profile.storeName,
          reason: reason?.trim() || undefined,
        }),
      },
    );
    if (res.ok) {
      await setSetting(SETTING_DELETE_PENDING, null);
      return { submitted: true, pending: false };
    }
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return {
      submitted: false,
      pending: false,
      error: data?.error ?? "Le serveur a refusé la demande.",
    };
  } catch {
    // Réseau HS : la demande survit à l'appareil et part dès que le serveur répond.
    await setSetting(SETTING_DELETE_PENDING, profile.deviceId);
    return { submitted: true, pending: true };
  }
}

/** Rejoue la demande persistée (`requestShopDeletion` hors ligne) — appelé à chaque
 *  handshake réussi ; sans effet si rien n'est en attente. */
export async function flushPendingDeleteRequest(): Promise<void> {
  const deviceId = await getSetting<string>(SETTING_DELETE_PENDING);
  if (!deviceId) return;
  const profile = await getShopProfile();
  const url = getOrchestratorUrl();
  if (!profile || !url) return;
  try {
    const res = await fetch(`${url}/api/v1/shops/${encodeURIComponent(deviceId)}/delete-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_name: profile.storeName }),
    });
    if (res.ok) await setSetting(SETTING_DELETE_PENDING, null);
  } catch {
    // Toujours hors ligne — on retentera au prochain handshake.
  }
}
