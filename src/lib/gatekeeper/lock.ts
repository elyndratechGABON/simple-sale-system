import { getSetting, setSetting } from "@/lib/db";
import { SETTING_LOCK_REASON, SETTING_LOCKED } from "./settings";
import type { LockReason } from "./types";

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

export function setLock(locked: boolean, reason: LockReason | null): void {
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

/**
 * Déverrouille la caisse LOCALEMENT, sans passer par le serveur. Utilisé par le flux de
 * paiement offline-first : une fois la preuve de paiement (SMS opérateur) validée sur
 * l'appareil, on lève le verrou et on efface son motif persistant. Le prochain handshake
 * réconciliera avec le serveur — si le compte est réellement à jour, la suspension ne
 * reviendra pas ; sinon, le serveur la re-posera (source de vérité).
 */
export async function unlockLocal(): Promise<void> {
  await setSetting(SETTING_LOCKED, false);
  await setSetting(SETTING_LOCK_REASON, null);
  setLock(false, null);
}

/**
 * Réinitialise le blocage « appareil déjà enregistré ailleurs ».
 *
 * On ne touche à AUCUNE donnée : ni la fiche, ni le catalogue. Un conflit d'empreinte est
 * un refus d'inscription, pas une décision de suppression — une boutique qui vend en local
 * doit rester utilisable pendant que le support débloque la situation. Le handshake suivant
 * repose le verrou si le conflit persiste.
 */
export async function resetDeviceConflict(): Promise<void> {
  await setSetting(SETTING_LOCKED, false);
  await setSetting(SETTING_LOCK_REASON, null);
  setLock(false, null);
}

/** Vide le verrou de suspension retenu en mémoire après une purge (`purgeAllData`). */
export function resetGatekeeper(): void {
  setLock(false, null);
  // Effacer l'empreinte matérielle pour que l'orchestrateur voie un appareil "neuf"
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("pos_device_fingerprint");
    } catch {
      // Ignoré : localStorage inaccessible (mode privé)
    }
  }
}
