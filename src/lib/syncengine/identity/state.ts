import type { DeviceKeys, SyncIdentity } from "../types";

let cache: SyncIdentity | null = null;
let keysCache: DeviceKeys | null = null;

/** Groupe de partage `s_` : deux appareils du même compte s'y rencontrent. Les groupes
 *  isolés `d_` (caisse jamais inscrite) n'ont rien à échanger, inutile de déranger le relais. */
export function isSharedGroup(shopId: string): boolean {
  return shopId.startsWith("s_");
}

/** Identité mise en cache. À n'appeler qu'après un `ensureIdentity()` — dans une
 *  transaction Dexie, on ne peut pas attendre ici. */
export function getIdentity(): SyncIdentity {
  if (!cache) throw new Error("Identity not loaded. Call ensureIdentity() first.");
  return cache;
}

export function getDeviceKeys(): DeviceKeys {
  if (!keysCache) throw new Error("Identity not loaded. Call ensureIdentity() first.");
  return keysCache;
}

/** Accès direct au cache (peut être `null` avant `ensureIdentity()`), pour les modules
 *  frères qui recalculent une valeur sans vouloir lever. */
export function getCachedIdentity(): SyncIdentity | null {
  return cache;
}

export function setCachedIdentity(identity: SyncIdentity | null): void {
  cache = identity;
}

export function setCachedKeys(keys: DeviceKeys | null): void {
  keysCache = keys;
}

/** Pour les tests uniquement : oublie le cache sans toucher à la base. */
export function resetIdentityForTests(): void {
  cache = null;
  keysCache = null;
}
