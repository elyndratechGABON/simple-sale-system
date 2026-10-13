import { getDB } from "../../db";
import type { DeviceKeys, DeviceRole, SyncIdentity } from "../types";
import { IDENTITY_KEYS, PAIRING_KEYS, SEQUENCE_KEY } from "../types";
import { generateKeyPair, isSigningJwk } from "./crypto";
import { deriveShopId } from "./shop-id";
import { getCachedIdentity, getIdentity, setCachedIdentity, setCachedKeys } from "./state";

/** Charge — ou crée au premier accès — l'identité de l'appareil.
 *
 *  Invariant : une fois créée, une identité ne change plus (même `deviceId`, mêmes clés),
 *  sauf `resetDeviceIdentity()` explicite. Le `shopId` est recalculé à chaque chargement
 *  depuis le profil compte, pour suivre une ré-association intervenue entre-temps.
 */
export async function ensureIdentity(): Promise<SyncIdentity> {
  const cached = getCachedIdentity();
  if (cached) return cached;
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
  let keys: DeviceKeys;
  // Une installation antérieure possède une paire RSA-OAEP qui n'a JAMAIS servi à
  // signer (l'algorithme n'a pas d'usage `sign`) : elle est remplacée, pas recyclée.
  // `deviceId` reste inchangé — l'appareil ne doit pas changer d'identité au milieu
  // d'une vie, sinon ses pairs le verront comme une nouvelle annonce.
  if (deviceId && (!isSigningJwk(storedPublic) || !isSigningJwk(storedPrivate))) {
    keys = await generateKeyPair();
    await db.settings.bulkPut([
      { key: IDENTITY_KEYS.publicKey, value: keys.publicKey },
      { key: IDENTITY_KEYS.privateKey, value: keys.privateKey },
    ]);
  } else if (!deviceId) {
    deviceId = crypto.randomUUID();
    keys = await generateKeyPair();
    await db.settings.bulkPut([
      { key: IDENTITY_KEYS.device, value: deviceId },
      { key: IDENTITY_KEYS.publicKey, value: keys.publicKey },
      { key: IDENTITY_KEYS.privateKey, value: keys.privateKey },
    ]);
  } else {
    keys = { publicKey: storedPublic ?? "", privateKey: storedPrivate ?? "" };
  }
  setCachedKeys(keys);

  const identity: SyncIdentity = {
    deviceId,
    shopId: await deriveShopId(deviceId),
    // Le rôle `manager` n'existe plus : une caisse qui en conserve la valeur stockée en
    // base devient employé — jamais propriétaire (pas de montée de privilège).
    role: roleRow?.value === "employee" || roleRow?.value === "manager" ? "employee" : "owner",
    employeeName: typeof nameRow?.value === "string" ? nameRow.value : "",
    employeePhone: typeof phoneRow?.value === "string" ? phoneRow.value : "",
  };
  setCachedIdentity(identity);
  return identity;
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
  const updated = { ...id, role };
  setCachedIdentity(updated);
  return updated;
}

export async function setIdentityEmployeeName(name: string): Promise<SyncIdentity> {
  const id = getIdentity();
  await getDB().settings.put({ key: IDENTITY_KEYS.employeeName, value: name.trim() });
  const updated = { ...id, employeeName: name.trim() };
  setCachedIdentity(updated);
  return updated;
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
  const updated = { ...id, employeePhone: phone.trim() };
  setCachedIdentity(updated);
  return updated;
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
  setCachedIdentity(null);
  setCachedKeys(null);
  return ensureIdentity();
}
