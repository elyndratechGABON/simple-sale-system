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

/** Version de l'application remontée au serveur (colonne `app_version_used`). */
export const APP_VERSION = "pos-web-1";

/** Identité du projet/app à laquelle appartient cette caisse (`shops.app_origin`).
 *  Configurable par build (VITE_APP_ORIGIN) ; défaut 'pos' — le projet historique. */
export const APP_ORIGIN = (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() || "pos";

const SETTING_LOCKED = "gatekeeper_suspended";
const SETTING_APPLIED = "gatekeeper_applied_command_ids";
const SETTING_MESSAGES = "gatekeeper_messages";

export type CommandType = "suspend" | "renew" | "broadcast_message";

export interface AdminCommand {
  id: string;
  action_type: CommandType;
  payload: {
    new_end_date?: number;
    days?: number;
    message_text?: string;
  };
  expires_at: number;
  created_at: number;
}

export interface HandshakeResult {
  ok: boolean;
  sync_allowed: boolean;
  status: "active" | "suspended" | "expired" | "unknown";
  reason?: "no-profile" | "network" | "error";
}

// ── Verrou de suspension (store minimal, synchrone pour useSyncExternalStore) ──────
type Listener = () => void;
const lockListeners = new Set<Listener>();
let lockValue = false;

export function subscribeLock(listener: Listener): () => void {
  lockListeners.add(listener);
  return () => {
    lockListeners.delete(listener);
  };
}

export function getLockSnapshot(): boolean {
  return lockValue;
}

function setLock(value: boolean): void {
  if (lockValue === value) return;
  lockValue = value;
  lockListeners.forEach((f) => f());
}

/** Restaure un éventuel verrou persistant — appelé au démarrage, avant tout handshake. */
export async function loadLockState(): Promise<void> {
  setLock(Boolean(await getSetting<boolean>(SETTING_LOCKED)));
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
      }),
    });
    if (!res.ok) return { ok: false, sync_allowed: false, status: "unknown", reason: "error" };

    const data = (await res.json()) as {
      status: "active" | "suspended" | "expired";
      sync_allowed: boolean;
      commands: AdminCommand[];
      shop?: { subscription_end_date?: number };
    };

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

    const suspended = data.status === "suspended";
    await setSetting(SETTING_LOCKED, suspended);
    setLock(suspended);

    return { ok: true, sync_allowed: data.sync_allowed !== false, status: data.status };
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
