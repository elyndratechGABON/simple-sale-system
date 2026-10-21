import { getShopProfile } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

/**
 * Libération en attente : la suppression a eu lieu HORS LIGNE.
 *
 * Le localStorage, et non la base IndexedDB : la suppression locale vide la base
 * (c'est le but), une file d'attente en base serait donc détruite au moment précis
 * où elle compte. Le localStorage, lui, survit à la purge.
 */
const PENDING_RELEASE_KEY = "caisse_pos_pending_device_release";

interface PendingRelease {
  device_id: string;
  store_name: string;
  fingerprint?: string;
  at: number;
}

function readPendingRelease(): PendingRelease | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_RELEASE_KEY);
    return raw ? (JSON.parse(raw) as PendingRelease) : null;
  } catch {
    return null;
  }
}

function writePendingRelease(value: PendingRelease): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_RELEASE_KEY, JSON.stringify(value));
  } catch {
    /* stockage indisponible : la libération attendra une suppression en ligne */
  }
}

function clearPendingRelease(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_RELEASE_KEY);
  } catch {
    /* rien à faire */
  }
}

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
 * Best-effort : un échec réseau ne doit jamais empêcher une démission. La demande
 * est alors mise en attente et repart au prochain cycle de synchronisation.
 */
export async function releaseSeat(
  targetDeviceId: string,
  fingerprint?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getShopProfile();
  if (!profile?.deviceId) return { ok: false, error: "Profil boutique absent." };
  const base = getOrchestratorUrl();
  if (!base) return { ok: false, error: "Aucun serveur de synchronisation configuré." };
  // L'empreinte vit dans le localStorage : elle survit à la purge de la base, donc
  // elle est encore connue au moment où l'écran se libère. Elle est calculée AVANT
  // l'appel : la demande en attente (hors ligne) doit la porter, sinon le rejeu ne
  // pourrait pas détacher l'empreinte.
  const empreinte = fingerprint ?? (await getDeviceFingerprint().catch(() => null));
  try {
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
      // Un REFUS du serveur (preuve insuffisante) ne se rejouera pas : la file ne
      // servirait qu'à refaire la même demande. Une PANNE, elle, se rejoue.
      if (res.status >= 400 && res.status < 500) {
        return { ok: false, error: data?.error ?? `Serveur : ${res.status}.` };
      }
      writePendingRelease({
        device_id: targetDeviceId || profile.deviceId,
        store_name: profile.storeName ?? "",
        ...(empreinte ? { fingerprint: empreinte } : {}),
        at: Date.now(),
      });
      return { ok: false, error: data?.error ?? `Serveur : ${res.status}.` };
    }
    clearPendingRelease();
    return { ok: true };
  } catch (e) {
    // Réseau coupé : la demande est mise en attente, elle repartira au prochain cycle.
    writePendingRelease({
      device_id: targetDeviceId || profile.deviceId,
      store_name: profile.storeName ?? "",
      ...(empreinte ? { fingerprint: empreinte } : {}),
      at: Date.now(),
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Impossible de contacter le serveur.",
    };
  }
}

/**
 * Rejoue une libération restée en attente (suppression faite hors ligne). Best-effort :
 * le demande reste en attente si le réseau est toujours absent.
 */
export async function flushPendingRelease(): Promise<boolean> {
  const pending = readPendingRelease();
  if (!pending) return false;
  const base = getOrchestratorUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/v1/devices/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: pending.device_id,
        store_name: pending.store_name,
        ...(pending.fingerprint ? { fingerprint: pending.fingerprint } : {}),
      }),
    });
    if (res.ok) {
      clearPendingRelease();
      return true;
    }
    // Un refus ne changera pas au fil du temps : on abandonne la demande.
    if (res.status >= 400 && res.status < 500) clearPendingRelease();
  } catch {
    /* toujours hors ligne : on retentera */
  }
  return false;
}
