import { getShopProfile } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";

/**
 * Rend la place d'un écran qui quitte le commerce.
 *
 * Le quota de l'orchestrateur compte les ÉCRANS DU COMPTE : sans libération, un
 * commerce qui a eu un employé ne peut plus en recrouver un autre, même après son
 * départ. Deux appelants, une seule route :
 *
 *  - l'écran qui part, à la démission (sa propre place) ;
 *  - le propriétaire, quand il reçoit l'op de départ d'un employé (l'appel a pu
 *    échouer chez l'employé — réseau coupé, téléphone éteint).
 *
 * Best-effort : un échec réseau ne doit jamais empêcher une démission. La place sera
 * rendue au prochain échange, quand le patron aura récupéré l'op de départ.
 */
export async function releaseSeat(
  targetDeviceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getShopProfile();
  if (!profile?.deviceId) return { ok: false, error: "Profil boutique absent." };
  const base = getOrchestratorUrl();
  if (!base) return { ok: false, error: "Aucun serveur de synchronisation configuré." };
  try {
    const res = await fetch(`${base}/api/v1/entry/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: targetDeviceId || profile.deviceId,
        // Le nom de boutique en preuve de soi : l'écran qui part se présente par ce
        // qu'il est (identifiant + enseigne), le propriétaire par ses identifiants de
        // compte. Le serveur accepte l'une ou l'autre.
        store_name: profile.storeName ?? "",
        ...(profile.accountPhone && profile.accountPassword
          ? {
              account_phone: profile.accountPhone,
              account_password: profile.accountPassword,
            }
          : {}),
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? `Serveur : ${res.status}.` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Impossible de contacter le serveur.",
    };
  }
}
