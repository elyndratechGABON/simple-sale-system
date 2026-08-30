// Identité d'appareil du moteur de synchronisation P2P.
//
// Chaque appareil possède :
//  - un `deviceId` unique, généré une fois, stable — il identifie le MOBILE, pas le compte ;
//  - une paire de clés WebCrypto (RSA-OAEP) ; la privée ne quitte JAMAIS l'appareil ;
//  - un `shopId` : le groupe de partage. Deux appareils du même `shopId` se synchronisent.
//
// Le `shopId` descend du compte marchand (`ShopProfile.accountPhone` + `accountName`) :
// deux caisses du même commerçant partagent le même groupe, et deux commerces différents
// ne peuvent pas se croiser. Sans compte (caisse jamais inscrite), l'appareil vit dans un
// groupe isolé `d_<device>` — il n'a encore rien à partager.
//
// Persistance : store `settings` (IndexedDB), pas localStorage. L'identité est de la donnée
// d'appareil : elle doit survivre au rechargement, être exclue des sauvegardes comme le
// dossier de documents, et être remise à zéro par `purgeAllData`/`resetDeviceIdentity`.
// Une fois chargée, elle est mise en cache pour que l'émission d'opérations — qui se fait
// DANS une transaction Dexie — reste synchrone après le premier chargement.
import { getDB, getShopProfile } from "../db";
import type { DeviceKeys, DeviceRole, SyncIdentity } from "./types";
import { IDENTITY_KEYS, PAIRING_KEYS, SEQUENCE_KEY } from "./types";

/** Groupe de partage `s_` : deux appareils du même compte s'y rencontrent. Les groupes
 *  isolés `d_` (caisse jamais inscrite) n'ont rien à échanger, inutile de déranger le relais. */
export function isSharedGroup(shopId: string): boolean {
  return shopId.startsWith("s_");
}

let cache: SyncIdentity | null = null;
let keysCache: DeviceKeys | null = null;

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

/** Charge — ou crée au premier accès — l'identité de l'appareil.
 *
 *  Invariant : une fois créée, une identité ne change plus (même `deviceId`, mêmes clés),
 *  sauf `resetDeviceIdentity()` explicite. Le `shopId` est recalculé à chaque chargement
 *  depuis le profil compte, pour suivre une ré-association intervenue entre-temps.
 */
export async function ensureIdentity(): Promise<SyncIdentity> {
  if (cache) return cache;
  const db = getDB();
  const [deviceRow, publicRow, privateRow, roleRow, nameRow] = await Promise.all([
    db.settings.get(IDENTITY_KEYS.device),
    db.settings.get(IDENTITY_KEYS.publicKey),
    db.settings.get(IDENTITY_KEYS.privateKey),
    db.settings.get(IDENTITY_KEYS.role),
    db.settings.get(IDENTITY_KEYS.employeeName),
  ]);

  let deviceId = deviceRow?.value as string | undefined;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    keysCache = await generateKeyPair();
    await db.settings.bulkPut([
      { key: IDENTITY_KEYS.device, value: deviceId },
      { key: IDENTITY_KEYS.publicKey, value: keysCache.publicKey },
      { key: IDENTITY_KEYS.privateKey, value: keysCache.privateKey },
    ]);
  } else {
    keysCache = {
      publicKey: (publicRow?.value as string) ?? "",
      privateKey: (privateRow?.value as string) ?? "",
    };
  }

  cache = {
    deviceId,
    shopId: await deriveShopId(deviceId),
    role: roleRow?.value === "manager" || roleRow?.value === "employee" ? roleRow.value : "owner",
    employeeName: typeof nameRow?.value === "string" ? nameRow.value : "",
  };
  return cache;
}

/**
 * Recalcule le `shopId` depuis le profil compte — à invoquer après un changement de
 * compte (`setShopAccount`, connexion par mot clé). Sans effet avant un `ensureIdentity()`.
 */
export async function refreshShopId(): Promise<string | null> {
  if (!cache) return null;
  const shopId = await deriveShopId(cache.deviceId);
  if (shopId !== cache.shopId) cache = { ...cache, shopId };
  return shopId;
}

export async function setIdentityRole(role: DeviceRole): Promise<SyncIdentity> {
  const id = getIdentity();
  await getDB().settings.put({ key: IDENTITY_KEYS.role, value: role });
  cache = { ...id, role };
  return cache;
}

export async function setIdentityEmployeeName(name: string): Promise<SyncIdentity> {
  const id = getIdentity();
  await getDB().settings.put({ key: IDENTITY_KEYS.employeeName, value: name.trim() });
  cache = { ...id, employeeName: name.trim() };
  return cache;
}

/** Oublie l'identité courante, purge le journal et repart d'un appareil neuf.
 *  À utiliser quand le mobile change de compte/commerce : les ops de l'ancien monde
 *  n'ont plus d'objet ici. */
export async function resetDeviceIdentity(): Promise<SyncIdentity> {
  const db = getDB();
  await db.transaction("rw", db.settings, db.sync_ops, async () => {
    await db.settings.bulkDelete([
      IDENTITY_KEYS.device,
      IDENTITY_KEYS.publicKey,
      IDENTITY_KEYS.privateKey,
      IDENTITY_KEYS.role,
      IDENTITY_KEYS.employeeName,
      SEQUENCE_KEY,
      // Un appareil neuf doit pouvoir (se) présenter à nouveau : le drapeau d'annonce
      // et le code de paire de l'ancienne vie n'ont plus de sens.
      PAIRING_KEYS.announced,
      PAIRING_KEYS.code,
      PAIRING_KEYS.codeExpiresAt,
    ]);
    await db.sync_ops.clear();
  });
  cache = null;
  keysCache = null;
  return ensureIdentity();
}

/** Pour les tests uniquement : oublie le cache sans toucher à la base. */
export function resetIdentityForTests(): void {
  cache = null;
  keysCache = null;
}

// ---------- Clés ----------

function generateKeyPair(): Promise<DeviceKeys> {
  return crypto.subtle
    .generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    )
    .then(async (pair) => {
      const [publicKey, privateKey] = await Promise.all([
        crypto.subtle.exportKey("jwk", pair.publicKey),
        crypto.subtle.exportKey("jwk", pair.privateKey),
      ]);
      return {
        publicKey: JSON.stringify(publicKey),
        privateKey: JSON.stringify(privateKey),
      };
    });
}

// ---------- shopId ----------

/** `s_<hash>` pour un compte marchand (partageable), `d_<device>` sinon (isolé). */
async function deriveShopId(deviceId: string): Promise<string> {
  const profile = await getShopProfile();
  let source: string | null = null;
  if (profile?.accountPhone) {
    source = `${profile.accountPhone.trim()}|${(profile.accountName ?? "").trim().toLowerCase()}`;
  } else if (profile?.accountKeyword) {
    // Écran rattaché PAR MOT CLÉ (téléphone perdu) : pas de téléphone, mais le mot clé
    // est unique par compte → les écrans du même compte convergent entre eux. Le « nom »
    // n'entre pas dans la source : chaque écran garde sa propre enseigne. Limite assumée :
    // un écran « mot clé » et un écran « téléphone+mot de passe » du MÊME compte n'ont
    // aucune source commune calculable localement — une fusion devra venir du relais.
    source = `kw|${profile.accountKeyword}`;
  }
  if (source) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    return `s_${hex(digest).slice(0, 12)}`;
  }
  return `d_${deviceId.replace(/-/g, "").slice(0, 12)}`;
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
