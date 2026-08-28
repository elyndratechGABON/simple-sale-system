// Le GATEKEEPER — point d'entrée du protocole v2 de l'orchestrateur.
//
// « Principe du tourniquet » : le serveur ne pousse JAMAIS. Cette caisse sonne
// (handshake), repart avec les ordres non livrés (suspend / renew / broadcast_message),
// les applique, puis — seulement si son statut est « active » — pousse ses agrégats via
// /sync-data. L'accusé de réception est implicite : le prochain handshake annonce le
// dernier ordre appliqué, le serveur marque livré tout ce qui précède.
//
// Règle d'or offline-first : la moindre panne réseau laisse l'application inchangée —
// verrou, échéance et messages ne bougent que sur SUCCÈS d'un handshake. Seule
// exception : le verrou déjà en place est rechargé au démarrage depuis IndexedDB, pour
// qu'une caisse suspendue le reste même sans réseau.
import { getShopProfile, getSetting, setSetting, setShopExpiry } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

/** Version de l'application remontée au serveur (colonne `app_version_used`). */
export const APP_VERSION = "pos-web-1";

/** Identité du projet/app à laquelle appartient cette caisse (`shops.app_origin`).
 *  Configurable par build (VITE_APP_ORIGIN) ; défaut 'pos' — le projet historique. */
export const APP_ORIGIN = (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() || "pos";

const SETTING_LOCKED = "gatekeeper_suspended";
const SETTING_LOCK_REASON = "gatekeeper_lock_reason";
const SETTING_APPLIED = "gatekeeper_applied_command_ids";
const SETTING_MESSAGES = "gatekeeper_messages";
const SETTING_QUOTA = "gatekeeper_account_quota";
const SETTING_REQUEST = "gatekeeper_subscription_request";
const SETTING_GRACE_ENDS_AT = "gatekeeper_grace_ends_at";

/** Places du compte marchand, telles que le serveur les voit au dernier handshake. */
export interface AccountQuota {
  maxDevices: number;
  deviceCount: number;
}

export async function getAccountQuota(): Promise<AccountQuota | null> {
  return (await getSetting<AccountQuota>(SETTING_QUOTA)) ?? null;
}

/**
 * Dernière demande d'abonnement du compte, telle que le serveur la voit au dernier
 * handshake : « pending » tant que l'admin n'a pas tranché, puis decided_at est posé.
 * Alimente l'indicateur « Demande en attente de validation » des Paramètres.
 */
export interface SubscriptionRequestStatus {
  status: "pending" | "approved" | "rejected";
  plan_price?: number;
  plan_devices?: number;
  reference?: string;
  created_at: number;
  decided_at?: number | null;
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

export type CommandType = "suspend" | "renew" | "broadcast_message";

/** Pourquoi la caisse est bloquée : abonnement suspendu, ou quota d'appareils dépassé. */
export type LockReason = "suspended" | "device_limit";

export interface AdminCommand {
  id: string;
  action_type: CommandType;
  payload: {
    new_end_date?: number;
    days?: number;
    max_devices?: number;
    message_text?: string;
  };
  expires_at: number;
  created_at: number;
}

export interface HandshakeResult {
  ok: boolean;
  sync_allowed: boolean;
  status: "active" | "suspended" | "expired" | "unknown";
  reason?: "no-profile" | "network" | "error" | "account_password" | "device_limit";
}

// ── Verrou de suspension (store minimal, synchrone pour useSyncExternalStore) ──────
// Le motif ET sa raison voyagent ensemble : l'écran de blocage adapte son message
// (« device_limit » = trop d'appareils sur le compte, pas un défaut de paiement).
type Listener = () => void;
interface LockSnapshot {
  locked: boolean;
  reason: LockReason | null;
}
const lockListeners = new Set<Listener>();
let lockValue: LockSnapshot = { locked: false, reason: null };

export function subscribeLock(listener: Listener): () => void {
  lockListeners.add(listener);
  return () => {
    lockListeners.delete(listener);
  };
}

export function getLockSnapshot(): LockSnapshot {
  return lockValue;
}

function setLock(locked: boolean, reason: LockReason | null): void {
  if (lockValue.locked === locked && lockValue.reason === reason) return;
  lockValue = { locked, reason };
  lockListeners.forEach((f) => f());
}

/** Restaure un éventuel verrou persistant — appelé au démarrage, avant tout handshake. */
export async function loadLockState(): Promise<void> {
  const locked = Boolean(await getSetting<boolean>(SETTING_LOCKED));
  const reason = (await getSetting<LockReason>(SETTING_LOCK_REASON)) ?? null;
  setLock(locked, locked ? (reason ?? "suspended") : null);
}

// ── Mémoire des ordres appliqués (idempotence) ────────────────────────────────────
// Persistée : si l'app meurt entre « appliquer » et « accuser », le même ordre peut
// revenir au prochain handshake — on le saute, on a déjà ses effets.
async function getAppliedIds(): Promise<string[]> {
  return (await getSetting<string[]>(SETTING_APPLIED)) ?? [];
}

async function setAppliedIds(ids: string[]): Promise<void> {
  await setSetting(SETTING_APPLIED, ids);
}

// ── Messages reçus (affichés par _app.tsx via sonner) ─────────────────────────────
export async function consumeMessages(): Promise<{ text: string; at: number }[]> {
  const messages = (await getSetting<{ text: string; at: number }[]>(SETTING_MESSAGES)) ?? [];
  if (messages.length > 0) await setSetting(SETTING_MESSAGES, []);
  return messages;
}

// ── Application d'un ordre ────────────────────────────────────────────────────────
async function applyCommand(command: AdminCommand): Promise<void> {
  if (command.action_type === "renew" && typeof command.payload.new_end_date === "number") {
    await setShopExpiry(command.payload.new_end_date);
  }
  if (command.action_type === "broadcast_message" && command.payload.message_text) {
    const messages = (await getSetting<{ text: string; at: number }[]>(SETTING_MESSAGES)) ?? [];
    await setSetting(
      SETTING_MESSAGES,
      [...messages, { text: command.payload.message_text, at: Date.now() }].slice(-5),
    );
  }
}

// ── Handshake ─────────────────────────────────────────────────────────────────────
export async function handshake(): Promise<HandshakeResult> {
  const profile = await getShopProfile();
  if (!profile) return { ok: false, sync_allowed: false, status: "unknown", reason: "no-profile" };
  const url = getOrchestratorUrl();
  if (!url) return { ok: false, sync_allowed: false, status: "unknown", reason: "no-profile" };

  const applied = await getAppliedIds();
  const lastApplied = applied.length > 0 ? applied[applied.length - 1] : null;
  const deviceFingerprint = await getDeviceFingerprint();

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
        // Identifiants du compte marchand (v3) : le serveur rattache cette caisse au
        // compte, ou le crée au premier contact avec un essai de 30 jours.
        ...(profile.accountPhone && profile.accountPassword
          ? {
              account_name: profile.accountName ?? "",
              account_phone: profile.accountPhone,
              account_password: profile.accountPassword,
            }
          : {}),
      }),
    });
    // Mot de passe erroné : refus net du serveur. On ne retente pas en boucle avec les
    // mêmes identifiants — l'utilisateur doit les corriger dans Paramètres.
    if (res.status === 403) {
      const data = (await res.json().catch(() => null)) as { code?: string } | null;
      if (data?.code === "account_password") {
        return { ok: false, sync_allowed: false, status: "unknown", reason: "account_password" };
      }
      return { ok: false, sync_allowed: false, status: "unknown", reason: "error" };
    }
    // Conflit d'empreinte : cet appareil est déjà enregistré sous un autre device_id.
    if (res.status === 409) {
      const data = (await res.json().catch(() => null)) as {
        code?: string;
        existing_device_id?: string;
      } | null;
      if (data?.code === "fingerprint_conflict") {
        return {
          ok: false,
          sync_allowed: false,
          status: "unknown",
          reason: "error",
        };
      }
      return { ok: false, sync_allowed: false, status: "unknown", reason: "error" };
    }
    if (!res.ok) return { ok: false, sync_allowed: false, status: "unknown", reason: "error" };

    const data = (await res.json()) as {
      status: "active" | "suspended" | "expired";
      sync_allowed: boolean;
      over_limit?: boolean;
      grace_period?: boolean;
      grace_ends_at?: number;
      commands: AdminCommand[];
      shop?: { subscription_end_date?: number };
      account?: { max_devices?: number; device_count?: number };
      subscription_request?: SubscriptionRequestStatus;
    };

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
      } satisfies AccountQuota);
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
    // propre raison : ce n'est pas un impayé, c'est une place manquante.
    const overLimit = data.over_limit === true;
    const suspended = data.status === "suspended";
    const reason: LockReason | null = overLimit ? "device_limit" : suspended ? "suspended" : null;
    await setSetting(SETTING_LOCKED, suspended);
    await setSetting(SETTING_LOCK_REASON, reason);
    setLock(suspended, reason);

    return {
      ok: true,
      sync_allowed: data.sync_allowed !== false,
      status: data.status,
      reason: overLimit ? "device_limit" : undefined,
    };
  } catch {
    return { ok: false, sync_allowed: false, status: "unknown", reason: "network" };
  }
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

/** Vide le verrou de suspension retenu en mémoire après une purge (`purgeAllData`). */
export function resetGatekeeper(): void {
  setLock(false, null);
}
