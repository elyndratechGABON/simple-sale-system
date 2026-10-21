import { getShopProfile } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

/**
 * Rend la place d'un écran qui quitte le commerce, ET libère son empreinte.
 *
 * Le quota de l'orchestrateur compte les ÉCRANS DU COMPTE : sans libération, un
 * commerce qui a eu un employé ne peut plus en recrouver un autre, même après son
 * départ.
 *
 * L'EMPREINTE (le lien entre ce téléphone physique et une boutique) doit être
 * libérée elle aussi : sinon le serveur garde l'appareil rattaché à l'ancienne
 * boutique et refuse toute nouvelle inscription — « Cet appareil est déjà
 * enregistré » — alors que l'utilisateur a tout effacé. L'empreinte est concernée
 * même quand l'identifiant d'appareil a changé (réinstallation : l'application
 * supprimée, la nouvelle identité a un autre `device_id`).
 *
 * Deux appelants, une seule route :
 *
 *  - l'écran qui part, à la démission ou à la suppression de sa boutique ;
 *  - le propriétaire, quand il reçoit l'op de départ d'un employé (l'appel a pu
 *    échouer chez l'employé — réseau coupé, téléphone éteint).
 *
 * Best-effort : un échec réseau ne doit jamais empêcher une démission. La place sera
 * rendue au prochain échange, quand le patron aura récupéré l'op de départ.
 */
export async function releaseSeat(
  targetDeviceId: string,
  fingerprint?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getShopProfile();
  if (!profile?.deviceId) return { ok: false, error: "Profil boutique absent." };
  const base = getOrchestratorUrl();
  if (!base) return { ok: false, error: "Aucun serveur de synchronisation configuré." };
  try {
    // L'empreinte vit dans le localStorage : elle survit à la purge de la base, donc
    // elle est encore connue au moment où l'écran se libère.
    const empreinte = fingerprint ?? (await getDeviceFingerprint().catch(() => null));
    const res = await fetch(`${base}/api/v1/devices/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: targetDeviceId || profile.deviceId,
        // Le nom de boutique en preuve de soi : l'écran qui part se présente par ce
        // qu'il est (identifiant + enseigne), le propriétaire par ses identifiants de
        // compte. Le serveur accepte l'une ou l'autre.
        store_name: profile.storeName ?? "",
        ...(empreinte ? { fingerprint: empreinte } : {}),
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
