import { getShopProfile, setSetting, setShopExpiry, setShopKeyword } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { devicePublicKey } from "@/lib/payments/proof";
import { toast } from "sonner";
import { applyAccountMetadata, handleHandshakeRefusal, lockDecision } from "./handshake-support";
import { applyCommand, getAppliedIds, setAppliedIds } from "./commands";
import { clearKeywordClaim, getKeywordClaim } from "./keyword";
import { setLock } from "./lock";
import {
  APP_ORIGIN,
  APP_VERSION,
  SETTING_GRACE_ENDS_AT,
  SETTING_KEYWORD_CLAIM,
  SETTING_KEYWORD_REVEALED,
  SETTING_LOCK_REASON,
  SETTING_LOCKED,
  SETTING_MAINTENANCE,
} from "./settings";
import type { AdminCommand, HandshakeResult, LockReason, SubscriptionRequestStatus } from "./types";

// ── Handshake ─────────────────────────────────────────────────────────────────────
export async function handshake(): Promise<HandshakeResult> {
  const profile = await getShopProfile();
  if (!profile) return { ok: false, sync_allowed: false, status: "unknown", reason: "no-profile" };
  const url = getOrchestratorUrl();
  if (!url) return { ok: false, sync_allowed: false, status: "unknown", reason: "no-profile" };

  const applied = await getAppliedIds();
  const lastApplied = applied.length > 0 ? applied[applied.length - 1] : null;
  const deviceFingerprint = await getDeviceFingerprint();
  const publicKey = await devicePublicKey();

  try {
    const res = await fetch(`${url}/api/v1/handshake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: profile.deviceId,
        store_name: profile.storeName,
        owner_name: profile.ownerName,
        phone: profile.phone ?? "",
        location: profile.location ?? "",
        app_version: APP_VERSION,
        app_origin: APP_ORIGIN,
        last_applied_command_id: lastApplied,
        device_fingerprint: deviceFingerprint,
        // La clé PUBLIQUE de l'appareil : c'est elle qui permet au serveur de
        // VÉRIFIER ce que l'écran lui envoie — notamment une preuve de paiement
        // signée (le SMS de Mobile Money transmis par l'application elle-même).
        device_public_key: publicKey,
        // Identifiants du compte marchand (v3) : le serveur rattache cette caisse au
        // compte, ou le crée au premier contact avec un essai de 30 jours.
        ...(profile.accountPhone && profile.accountPassword
          ? {
              account_name: profile.accountName ?? "",
              account_phone: profile.accountPhone,
              account_password: profile.accountPassword,
            }
          : {}),
        // Mot clé de récupération (v3) : un écran qui a perdu téléphone/mot de passe se
        // rattache au compte par son mot clé seul (nom boutique + propriétaire + mot clé).
        // Porteur des identifiants téléphone/mdp, il les présente (bloc ci-dessus) et
        // n'a pas besoin du mot clé — les deux clés ne voyagent jamais ensemble.
        ...(profile.accountKeyword && !(profile.accountPhone && profile.accountPassword)
          ? {
              account_name: profile.accountName ?? profile.storeName,
              account_keyword: profile.accountKeyword,
            }
          : {}),
      }),
    });
    const refusal = await handleHandshakeRefusal(res);
    if (refusal) return refusal;
    if (!res.ok) return { ok: false, sync_allowed: false, status: "unknown", reason: "error" };

    const data = (await res.json()) as {
      status: "active" | "suspended" | "expired";
      sync_allowed: boolean;
      over_limit?: boolean;
      grace_period?: boolean;
      grace_ends_at?: number;
      /** Mode maintenance : la caisse cesse de synchroniser, elle encaisse quand même. */
      maintenance?: { enabled?: boolean; message?: string };
      commands: AdminCommand[];
      shop?: { subscription_end_date?: number };
      account?: { max_devices?: number; device_count?: number; id?: string };
      subscription_request?: SubscriptionRequestStatus;
      /** Mot clé de récupération — présent UNIQUEMENT à la création du compte. */
      keyword?: string;
    };

    await applyAccountMetadata(data);

    // Le mode maintenance est retenu tel quel : la caisse l'affiche et cesse de
    // synchroniser. Il est EFFACÉ dès que le serveur dit que c'est fini (une levée
    // de maintenance ne doit pas laisser les caisses en carence).
    const maintenance = data.maintenance;
    if (maintenance && maintenance.enabled) {
      await setSetting(SETTING_MAINTENANCE, {
        enabled: true,
        message: maintenance.message ?? "",
      });
    } else {
      await setSetting(SETTING_MAINTENANCE, null);
    }

    const nextApplied = [...applied];
    for (const command of data.commands ?? []) {
      if (nextApplied.includes(command.id)) continue;
      await applyCommand(command);
      nextApplied.push(command.id);
    }
    if (nextApplied.length !== applied.length) await setAppliedIds(nextApplied);

    // L'échéance renvoyée par le serveur fait foi (prolongations /extend et renew y
    // sont déjà répercutées) — la caisse s'y cale à chaque handshake.
    if (
      typeof data.shop?.subscription_end_date === "number" &&
      Number.isFinite(data.shop.subscription_end_date)
    ) {
      await setShopExpiry(data.shop.subscription_end_date);
    }

    // Un écran au-delà du quota d'appareils est bloqué comme un suspendu, mais avec sa
    // propre raison : ce n'est pas un impayé, c'est une place manquante. Un compte
    // EXPIRÉ (période de grâce de 3 jours écoulée) est bloqué lui aussi : c'est la fin
    // de la tolérance.
    const { locked, reason } = lockDecision({
      over_limit: data.over_limit === true,
      status: data.status,
    });
    await setSetting(SETTING_LOCKED, locked);
    await setSetting(SETTING_LOCK_REASON, reason);
    setLock(locked, reason);

    // Mot clé généré à la création : l'écran fondateur est le SEUL à le recevoir — il
    // doit le conserver (il resservira sur un autre téléphone). Posé une seule fois,
    // puis révélé par GatekeeperAlerts, jamais réaffiché.
    if (typeof data.keyword === "string" && data.keyword && !profile.accountKeyword) {
      await setShopKeyword(data.keyword);
      await setSetting(SETTING_KEYWORD_REVEALED, false);
      await setSetting(SETTING_KEYWORD_CLAIM, null);
    }

    // Une vérification par mot clé était en attente (serveur éteint à la soumission) :
    // le serveur vient de confirmer → on lève la réclamation et on notifie, une fois.
    if (await getKeywordClaim()) {
      await clearKeywordClaim();
      toast.success("Compte vérifié", {
        description: "Votre caisse est rattachée au compte. Vous pouvez continuer.",
      });
    }

    return {
      ok: true,
      sync_allowed: data.sync_allowed !== false,
      status: data.status,
      reason: reason ?? undefined,
    };
  } catch {
    return { ok: false, sync_allowed: false, status: "unknown", reason: "network" };
  }
}
