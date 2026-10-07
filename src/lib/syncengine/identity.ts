// Identité d'appareil du moteur de synchronisation P2P.
//
// Chaque appareil possède :
//  - un `deviceId` unique, généré une fois, stable — il identifie le MOBILE, pas le compte ;
//  - une paire de clés WebCrypto (ECDSA P-256) servant à SIGNER ses opérations ; la
//    privée ne quitte JAMAIS l'appareil. C'est la preuve d'origine d'une op : le relais
//    est aveugle et `shop_id` vient du client, donc rien d'autre ne dit qu'une op vient
//    d'un appareil du groupe (cf. `signOp` / `verifyOpSignature`, et `isTrustedOp` côté
//    application qui refuse tout ce qui ne se vérifie pas) ;
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
import type { DeviceKeys, DeviceRole, SyncIdentity, SyncOp } from "./types";
import { IDENTITY_ADOPTED_SHOP_ID, IDENTITY_KEYS, PAIRING_KEYS, SEQUENCE_KEY } from "./types";

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

// ---------- Signature des opérations ----------

/**
 * Corps exact couvert par la signature d'une opération. Les champs qui décrivent
 * l'AUTORITÉ de l'op (`device_id`, `shop_id`, `seq`, `id`, `created_at`, `type`,
 * `entity_id`) et le `payload` — mais ni `sig` ni `status` (cyclage d'outbox local,
 * réécrit après signature) ni aucun champ d'horodatage de mise à jour.
 *
 * `JSON.stringify` est déterministe pour un objet construit dans le même ordre à
 * l'émission et à la vérification : les deux lectures viennent du même JSON issu du
 * relais, donc les clés se présentent dans le même ordre des deux côtés.
 */
export function signableBody(op: SyncOp): string {
  return JSON.stringify({
    id: op.id,
    shop_id: op.shop_id,
    device_id: op.device_id,
    seq: op.seq,
    type: op.type,
    entity_id: op.entity_id,
    payload: op.payload ?? null,
    created_at: op.created_at,
  });
}

const b64 = {
  enc(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  },
  dec(s: string): Uint8Array {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  },
};

/** Paramètres de la paire de signature. ECDSA P-256 : clé 64 octets, signature 64 octets —
 *  contre 256/256 pour RSA, sur le canal qui transporte le catalogue à chaque rotation. */
const SIGN_ALGO = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_HASH = { name: "ECDSA", hash: "SHA-256" } as const;

/** Une clé d'un ancien déploiement (RSA-OAEP, jamais utilisée pour signer) est-elle
 *  réutilisable ici ? Non : l'algorithme ne correspond pas. */
function isSigningJwk(jwk: string | undefined): boolean {
  if (!jwk) return false;
  try {
    const parsed = JSON.parse(jwk) as JsonWebKey;
    return parsed.kty === "EC" && parsed.crv === "P-256";
  } catch {
    return false;
  }
}

async function importKey(jwk: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const parsed = JSON.parse(jwk) as JsonWebKey;
  // Le JWK exporté porte le `key_ops` de sa génération ; les usages demandés font
  // autorité, on retire l'attribut pour éviter un conflit à l'import.
  delete parsed.key_ops;
  return crypto.subtle.importKey("jwk", parsed, SIGN_ALGO, false, usages);
}

/** Signe `op` avec la clé privée de cet appareil. Renvoie l'op à pousser. */
export async function signOp(op: SyncOp): Promise<SyncOp> {
  const { privateKey } = getDeviceKeys();
  if (!privateKey) return op;
  const key = await importKey(privateKey, ["sign"]);
  const sig = await crypto.subtle.sign(SIGN_HASH, key, new TextEncoder().encode(signableBody(op)));
  return { ...op, sig: b64.enc(sig) };
}

/** `verify` de WebCrypto est déjà à temps constant. */
export async function verifyOpSignature(op: SyncOp, publicKeyJwk: string): Promise<boolean> {
  if (!op.sig || !publicKeyJwk) return false;
  try {
    const key = await importKey(publicKeyJwk, ["verify"]);
    return await crypto.subtle.verify(
      SIGN_HASH,
      key,
      b64.dec(op.sig) as unknown as BufferSource,
      new TextEncoder().encode(signableBody(op)),
    );
  } catch {
    // Clé illisible ou signature malformée : refus, jamais d'exception qui remonterait
    // jusqu'à l'appelant et laisserait l'op Applied.
    return false;
  }
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
  const [deviceRow, publicRow, privateRow, roleRow, nameRow, phoneRow] = await Promise.all([
    db.settings.get(IDENTITY_KEYS.device),
    db.settings.get(IDENTITY_KEYS.publicKey),
    db.settings.get(IDENTITY_KEYS.privateKey),
    db.settings.get(IDENTITY_KEYS.role),
    db.settings.get(IDENTITY_KEYS.employeeName),
    db.settings.get(IDENTITY_KEYS.employeePhone),
  ]);

  let deviceId = deviceRow?.value as string | undefined;
  const storedPublic = publicRow?.value as string | undefined;
  const storedPrivate = privateRow?.value as string | undefined;
  // Une installation antérieure possède une paire RSA-OAEP qui n'a JAMAIS servi à
  // signer (l'algorithme n'a pas d'usage `sign`) : elle est remplacée, pas recyclée.
  // `deviceId` reste inchangé — l'appareil ne doit pas changer d'identité au milieu
  // d'une vie, sinon ses pairs le verront comme une nouvelle annonce.
  if (deviceId && (!isSigningJwk(storedPublic) || !isSigningJwk(storedPrivate))) {
    keysCache = await generateKeyPair();
    await db.settings.bulkPut([
      { key: IDENTITY_KEYS.publicKey, value: keysCache.publicKey },
      { key: IDENTITY_KEYS.privateKey, value: keysCache.privateKey },
    ]);
  } else if (!deviceId) {
    deviceId = crypto.randomUUID();
    keysCache = await generateKeyPair();
    await db.settings.bulkPut([
      { key: IDENTITY_KEYS.device, value: deviceId },
      { key: IDENTITY_KEYS.publicKey, value: keysCache.publicKey },
      { key: IDENTITY_KEYS.privateKey, value: keysCache.privateKey },
    ]);
  } else {
    keysCache = { publicKey: storedPublic ?? "", privateKey: storedPrivate ?? "" };
  }

  cache = {
    deviceId,
    shopId: await deriveShopId(deviceId),
    // Le rôle `manager` n'existe plus : une caisse qui en conserve la valeur stockée en
    // base devient employé — jamais propriétaire (pas de montée de privilège).
    role: roleRow?.value === "employee" || roleRow?.value === "manager" ? "employee" : "owner",
    employeeName: typeof nameRow?.value === "string" ? nameRow.value : "",
    employeePhone: typeof phoneRow?.value === "string" ? phoneRow.value : "",
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

/**
 * Adopte le `shop_id` du GROUPE transmis par le relais lors d'un appairage.
 *
 * `deriveShopId` recalcule un `shop_id` à partir du profil local. Ce n'est pas la même
 * chose que le groupe réel du commerçant : dès que le propriétaire a reçu un `accountId`
 * du serveur, le sien vaut `s_41` alors que celui dérivé du téléphone vaut
 * `SHA-256(téléphone|nom)`. Un employé qui ne fait qu'hériter du téléphone atterrit donc
 * dans un groupe à part — il encaisse, et le propriétaire ne voit rien.
 *
 * Le relais, lui, connaît le vrai groupe : c'est le `shop_id` inscrit dans
 * `share_tokens` au moment où le propriétaire a fabriqué le QR. On l'écrit tel quel, et
 * `deriveShopId` s'y tient ensuite.
 *
 * Un `shop_id` de forme inattendue est refusé : on n'écrit pas une valeur qui pourrait
 * ensuite passer pour un groupe existant.
 *
 * @returns le `shop_id` adopté, ou `null` si rien n'a été écrit.
 */
export async function adoptShopIdFromRelay(shopId: string): Promise<string | null> {
  if (!/^s_[A-Za-z0-9_-]{1,24}$/.test(shopId)) return null;
  await getDB().settings.put({ key: IDENTITY_ADOPTED_SHOP_ID, value: shopId });
  // Le cache doit refléter la valeur tout de suite : le handshake et le premier push
  // partent dans la foulée du scan, et traverseraient sinon l'ancien groupe.
  if (cache) cache = { ...cache, shopId };
  return shopId;
}

/** Oublie le groupe adopté (purge de compte, changement de boutique). */
export async function clearAdoptedShopId(): Promise<void> {
  await getDB().settings.delete(IDENTITY_ADOPTED_SHOP_ID);
  if (cache) cache = { ...cache, shopId: await deriveShopId(cache.deviceId) };
}

export async function setIdentityRole(role: DeviceRole): Promise<SyncIdentity> {
  const id = getIdentity();

  // SAFEGUARD: Une fois employee, jamais owner (escalade de privilege interdite)
  // Un appareil employee qui tenterait de se reassigner owner serait une faille de
  // securite grave. On refuse silencieusement et loggons pour audit.
  if (id.role === "employee" && role === "owner") {
    console.warn(`[Identity Security] Refused employee owner escalation on device ${id.deviceId}`);
    return id; // Retourne l'identite inchangee, pas d'erreur (fail-safe)
  }

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

/** Le numéro est déclaré par l'EMPLOYÉ, pas déduit : le patron doit pouvoir l'appeler
 *  sans que l'application invente quoi que ce soit. Vide = non déclaré.
 *
 *  ⚠️ Neither setter se ré-annonce : `pairing.ts` importe `identity.ts`, donc l'appel
 *  dans l'autre sens créerait un cycle d'imports. C'est à l'appelant (écran de saisie)
 *  d'enchaîner `reannounceProfile()` juste après. */
export async function setIdentityEmployeePhone(phone: string): Promise<SyncIdentity> {
  const id = getIdentity();
  await getDB().settings.put({ key: IDENTITY_KEYS.employeePhone, value: phone.trim() });
  cache = { ...id, employeePhone: phone.trim() };
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
      IDENTITY_KEYS.employeePhone,
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
  return crypto.subtle.generateKey(SIGN_ALGO, true, ["sign", "verify"]).then(async (pair) => {
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

  // SOURCE D'AUTORITÉ N°1 : un `shop_id` ADOPTÉ, c'est-à-dire transmis par le relais lors
  // d'un appairage (`share_tokens.shop_id`, cf. welcome.tsx `adoptShopIdFromRelay`).
  // On ne le recalcule surtout pas : il est le seul qui garantisse que l'employé atterrit
  // dans le groupe EXACT du propriétaire. Dérivé du téléphone, il serait différent.
  const adopted = await getDB()
    .settings.get(IDENTITY_ADOPTED_SHOP_ID)
    .then((r) => (typeof r?.value === "string" ? r.value : null))
    .catch(() => null);
  if (adopted && /^s_[A-Za-z0-9_-]{1,24}$/.test(adopted)) return adopted;

  let source: string | null = null;
  // SOURCE D'AUTORITÉ : l'identifiant de compte, non dérivable localement. Tant que
  // l'orchestrateur n'en fournit pas, on retombe sur la dérivation ci-dessous.
  const accountId = profile?.accountId?.trim();
  if (accountId) return `s_${accountId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24)}`;

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
