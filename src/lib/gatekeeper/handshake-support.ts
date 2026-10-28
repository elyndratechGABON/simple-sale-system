import { setSetting, setShopAccountId } from "@/lib/db";
import { refreshShopId } from "@/lib/syncengine/identity";
import { resetDeviceIdentity } from "@/lib/syncengine/identity";
import { setLock } from "./lock";
import {
  SETTING_GRACE_ENDS_AT,
  SETTING_LOCK_REASON,
  SETTING_LOCKED,
  SETTING_QUOTA,
  SETTING_REQUEST,
} from "./settings";
import type { AccountQuota, HandshakeResult, LockReason, SubscriptionRequestStatus } from "./types";

/** Refus net du serveur au handshake (403 mot de passe/mot clé, 409 conflit d'empreinte).
 *  `null` signifie « pas un refus » — l'appelant poursuit avec la réponse normale. */
export async function handleHandshakeRefusal(res: Response): Promise<HandshakeResult | null> {
  // Mot de passe erroné : refus net du serveur. On ne retente pas en boucle avec les
  // mêmes identifiants — l'utilisateur doit les corriger dans Paramètres.
  if (res.status === 403) {
    const data = (await res.json().catch(() => null)) as { code?: string } | null;
    if (data?.code === "account_password") {
      return { ok: false, sync_allowed: false, status: "unknown", reason: "account_password" };
    }
    if (data?.code === "keyword_invalid") {
      // Mot clé inconnu : blocage dur immédiat (cf. SuspendedScreen) tant que les
      // informations ne sont pas corrigées — c'est le pendant du 403 mot de passe.
      await setSetting(SETTING_LOCKED, true);
      await setSetting(SETTING_LOCK_REASON, "keyword_invalid" as LockReason);
      setLock(true, "keyword_invalid");
      return { ok: false, sync_allowed: false, status: "unknown", reason: "keyword_invalid" };
    }
    return { ok: false, sync_allowed: false, status: "unknown", reason: "error" };
  }
  // Conflit d'empreinte : cet appareil est déjà enregistré sous un autre device_id.
  // Blocage DUR et NOMMÉ, pas un vague « error » : sans message, le commerçant
  // réessaie en boucle, chaque essai lui renvoyant la même erreur muette. Le nom de la
  // boutique en conflit est affiché tel quel par le serveur, et un bouton « Réessayer »
  // permet de retenter après que le support ait débloqué la situation.
  if (res.status === 409) {
    const data = (await res.json().catch(() => null)) as {
      code?: string;
      existing_device_id?: string;
      error?: string;
    } | null;
    if (data?.code === "fingerprint_conflict") {
      // --- AUTO-FIX : empreinte en conflit → on efface l'empreinte locale, on régénère
      // l'identité (nouveau deviceId), et on laisse l'appelant retenter le handshake ---
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("pos_device_fingerprint");
        } catch {
          // Ignoré : localStorage inaccessible (mode privé)
        }
      }
      await resetDeviceIdentity();
      // On ne verrouille PAS l'écran : on laisse l'appelant retenter le handshake
      // avec la nouvelle identité (nouveau deviceId, nouvelle empreinte).
      return {
        ok: false,
        sync_allowed: false,
        status: "unknown",
        reason: "fingerprint_conflict_auto_reset",
      };
    }
    return { ok: false, sync_allowed: false, status: "unknown", reason: "error" };
  }
  // Quota d'appareils dépassé (over_limit) : l'orchestrateur a compté trop d'appareils.
  // Cela arrive souvent quand un device.leave n'a pas encore été traité par l'orchestrateur.
  // AUTO-FIX : on réinitialise l'identité locale (nouveau deviceId + empreinte fraîche)
  // et on laisse l'appelant retenter le handshake.
  if (res.status === 403 || res.status === 200) {
    const data = (await res
      .clone()
      .json()
      .catch(() => null)) as { over_limit?: boolean } | null;
    if (data?.over_limit === true) {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("pos_device_fingerprint");
        } catch {
          // Ignoré
        }
      }
      await resetDeviceIdentity();
      return {
        ok: false,
        sync_allowed: false,
        status: "unknown",
        reason: "device_limit_auto_reset",
      };
    }
  }
  return null;
}

/**
 * La décision de VERROUILLER l'écran, d'après la réponse du serveur.
 *
 * Quatre blocages, quatre raisons — et un cas qui n'en est pas un :
 *  - `device_limit` : trop d'écrans sur le compte (une place manque) ;
 *  - `suspended` : décision d'Elyndra ;
 *  - `expired` : l'échéance est passée ET la période de grâce (3 jours) avec — la
 *    tolérance est finie, le service est coupé (les données locales restent intactes) ;
 *  - `keyword_invalid` / `device_conflict` : des rejeux d'informations, pas une dette.
 *
 * Pendant la GRÂCE, le compte est encore « actif » : l'écran n'est jamais bloqué.
 */
export function lockDecision(data: { over_limit?: boolean; status: string }): {
  locked: boolean;
  reason: LockReason | null;
} {
  if (data.over_limit === true) return { locked: true, reason: "device_limit" };
  if (data.status === "suspended") return { locked: true, reason: "suspended" };
  if (data.status === "expired") return { locked: true, reason: "expired" };
  return { locked: false, reason: null };
}

/** Répercute sur le stockage local les métadonnées de compte de la réponse au handshake
 *  (places, identifiant de compte, demande d'abonnement, grace period). Tolérant : un
 *  serveur ancien sans ces champs laisse l'état précédent en place. */
export async function applyAccountMetadata(data: {
  account?: {
    max_devices?: number;
    device_count?: number;
    id?: string;
    plan_name?: string | null;
    trial?: boolean;
  };
  subscription_request?: SubscriptionRequestStatus;
  grace_ends_at?: number;
  grace_period?: boolean;
}): Promise<void> {
  // Places du compte : alimente la carte « Appareils » des paramètres. Rien de
  // bloquant — un serveur ancien sans ce champ laisse la valeur précédente en place.
  if (
    typeof data.account?.max_devices === "number" &&
    Number.isFinite(data.account.max_devices) &&
    typeof data.account?.device_count === "number"
  ) {
    await setSetting(SETTING_QUOTA, {
      maxDevices: data.account.max_devices,
      deviceCount: data.account.device_count,
      // Le palier et l'état essai/abonné : c'est ce que le commerçant lit dans
      // « Paramètres → Compte → Abonnement ».
      ...(data.account.plan_name ? { planName: data.account.plan_name } : {}),
      ...(typeof data.account.trial === "boolean" ? { trial: data.account.trial } : {}),
    } satisfies AccountQuota);
  }

  // Identifiant de compte opaque, persisté sur la fiche. C'est lui qui devient la
  // source du `shopId` : non dérivable de l'extérieur, donc non énumérable, là où la
  // dérivation téléphone+nom se devinait. Un serveur ancien ne l'envoie pas — la caisse
  // garde alors sa dérivation locale, sans casser.
  if (typeof data.account?.id === "string" && data.account.id.trim()) {
    await setShopAccountId(data.account.id.trim());
    await refreshShopId();
  }

  // Statut de la demande d'abonnement : même tolérance qu'au-dessus (serveur ancien).
  if (data.subscription_request) {
    await setSetting(SETTING_REQUEST, data.subscription_request);
  }

  // Grace period : le serveur envoie grace_ends_at quand le compte a expiré mais
  // bénéficie encore de la période de grâce. Si absent → on nettoie (plus en grace).
  if (data.grace_ends_at && data.grace_period) {
    await setSetting(SETTING_GRACE_ENDS_AT, data.grace_ends_at);
  } else {
    await setSetting(SETTING_GRACE_ENDS_AT, null);
  }
}
