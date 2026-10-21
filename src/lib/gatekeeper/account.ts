import { getSetting, getShopProfile, setShopAccount } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { handshake } from "./handshake";
import { APP_ORIGIN, SETTING_GRACE_ENDS_AT, SETTING_QUOTA, SETTING_REQUEST } from "./settings";
import type { AccountQuota, SubscriptionRequestStatus } from "./types";

export async function getAccountQuota(): Promise<AccountQuota | null> {
  return (await getSetting<AccountQuota>(SETTING_QUOTA)) ?? null;
}

/**
 * RÉASSOCIER ce téléphone à son compte marchand.
 *
 * Le cas : la fiche locale a été purgée (suppression de la boutique, réinstallation),
 * donc les identifiants du compte ont disparu, et le serveur refuse l'écran parce que
 * son empreinte appartient encore à son ANCIEN poste — « Cet appareil est déjà
 * enregistré ». Sans ce chemin, le commerçant est coincé : il ne peut ni travailler
 * (la caisse est bloquée) ni se rattacher.
 *
 * Le téléphone + le mot de passe du compte prouvent le DROIT sur ce commerce : le
 * serveur laisse alors l'écran réattribuer sa propre fiche (le même commerce, la
 * même empreinte, le même téléphone).
 */
export async function reattachAccount(
  phone: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const profil = await getShopProfile();
  const tel = phone.trim();
  const mdp = password.trim();
  if (!tel || mdp.length < 4) {
    return { ok: false, error: "Indiquez le téléphone et le mot de passe du compte." };
  }
  await setShopAccount({
    name: profil?.storeName ?? "",
    phone: tel,
    password: mdp,
    ownerName: profil?.ownerName ?? "",
  });
  // Le handshake immédiat : le verrou se lève dès que le serveur a reconnu le compte.
  const result = await handshake();
  if (!result.ok) {
    return {
      ok: false,
      error: "Le serveur n'a pas reconnu ce compte. Vérifiez le téléphone et le mot de passe.",
    };
  }
  return { ok: true };
}

/**
 * Relit les places du compte marchand AUPRÈS DU SERVEUR, sans attendre le cycle de sync.
 *
 * Le compteur affiché (« 2 / 3 écrans ») vient de la réponse du handshake. Hors ligne, ou
 * simplement entre deux cycles, il datait du dernier écran connu — un employé qui venait
 * de scanner n'y était pas, et le patron lisait une place libre alors qu'elle était prise.
 * Appelé à l'ouverture de « Ajouter un device » : c'est l'instant où il regarde.
 *
 * Best-effort : hors ligne, la valeur en cache reste affichée — c'est déjà ce qu'on
 * montrait, et un « 0/3 » inventé serait pire que « je ne sais pas ».
 */
export async function refreshAccountQuota(): Promise<AccountQuota | null> {
  const result = await handshake();
  if (!result.ok) return null;
  return getAccountQuota();
}

/**
 * Rattache un écran approuvé au compte marchand côté orchestrateur (`/api/v1/account/bless`).
 * Best-effort : le crédit d'écran vit d'abord localement (`1 + écrans approuvés`) ; cet appel
 * ne fait que le faire remonter dès que l'orchestrateur répond — il ne bloque jamais l'usage.
 */
export async function blessEmployeeDevice(
  serverDeviceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!serverDeviceId) {
    return {
      ok: false,
      message: "L'écran ne s'est jamais présenté au serveur (aucune fiche boutique).",
    };
  }
  const profile = await getShopProfile();
  if (!profile?.accountPhone || !profile?.accountPassword) {
    return {
      ok: false,
      message: "Cet écran n'a pas les identifiants du compte (téléphone + mot de passe).",
    };
  }
  const base = getOrchestratorUrl();
  if (!base) return { ok: false, message: "Orchestrateur non configuré sur cet écran." };
  try {
    const res = await fetch(`${base}/api/v1/account/bless`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_phone: profile.accountPhone,
        account_password: profile.accountPassword,
        target_device_id: serverDeviceId,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.status === 404) {
        return {
          ok: false,
          message: "L'écran employé doit se connecter au serveur une fois (404 serveur).",
        };
      }
      return { ok: false, message: data?.error ?? `Serveur : ${res.status}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Orchestrateur injoignable — nouvel essai au prochain cycle." };
  }
}

export async function getSubscriptionRequest(): Promise<SubscriptionRequestStatus | null> {
  return (await getSetting<SubscriptionRequestStatus>(SETTING_REQUEST)) ?? null;
}

/**
 * Date de fin de la grace period (timestamp ms). Renseigné par le handshake quand le
 * serveur renvoie `grace_ends_at`. `null` = pas en grace.
 */
export async function getGraceEndsAt(): Promise<number | null> {
  return (await getSetting<number>(SETTING_GRACE_ENDS_AT)) ?? null;
}

// ── Sync des agrégats (stockage brut côté serveur) ────────────────────────────────
export async function syncData(data: unknown, appOrigin = APP_ORIGIN): Promise<boolean> {
  const profile = await getShopProfile();
  if (!profile) return false;
  const url = getOrchestratorUrl();
  if (!url) return false;
  try {
    const res = await fetch(`${url}/api/v1/sync-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: profile.deviceId,
        data_payload: data,
        app_origin: appOrigin,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
