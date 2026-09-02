// Appairage entre appareils du même compte — le « code de paire » coopératif.
//
// Le QR téléphone+mot de passe (src/lib/pairing.ts) rattache un écran au COMPTE côté
// orchestrateur. Le code de paire, lui, fait se RENCONTRER les appareils sur le canal
// d'ops P2P : il n'ouvre pas de session serveur, il prouve l'intention. Un employé
// tape le code affiché par le principal → son appareil émet `device.announce` (nom,
// rôle, clé publique, code). Le principal applique l'annonce et vérifie le code
// LOCALEMENT (celui qu'il a généré, jamais envoyé) ; s'il correspond, le pair est
// `paired` d'office. Sinon le pair reste `pending` et le principal peut approuver à
// la main (`device.approve`).
//
// Le code a une durée de vie courte (10 min) : la preuve s'use, pas le pairing.
// Un appareil se présente au groupe UNE SEULE fois (drapeau `announced`) : rejouer
// l'onboarding (re-saisir un code) ne re-émet donc pas d'op.
import { getDB, getShopProfile } from "../db";
import { emitOp } from "./ops";
import { ensureIdentity, getDeviceKeys, getIdentity, isSharedGroup } from "./identity";
import type { DeviceRole, PairedDevice } from "./types";
import { PAIRING_KEYS } from "./types";

/** 6 caractères sans ambiguité visuelle (pas de 0/O, 1/I, ni de lettres à géométrie proche). */
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIR_CODE_LENGTH = 6;
const PAIR_CODE_TTL_MS = 10 * 60_000;

export const ROLE_LABELS: Record<DeviceRole, string> = {
  owner: "Propriétaire",
  manager: "Gérant",
  employee: "Employé",
};

/** Rôle local. Par défaut `owner` : c'est le principal qui affiche le code. */
export function getIdentityRole(): DeviceRole {
  return getIdentity().role;
}

export function isOwnerIdentity(): boolean {
  return getIdentity().role === "owner";
}

function randomCode(): string {
  const out = new Array<string>(PAIR_CODE_LENGTH);
  for (let i = 0; i < PAIR_CODE_LENGTH; i++) {
    out[i] = CHARSET[crypto.getRandomValues(new Uint32Array(1))[0] % CHARSET.length];
  }
  return out.join("");
}

/** Génère un code de paire frais (10 min) et le retient localement. */
export async function generatePairingCode(): Promise<string> {
  await ensureIdentity();
  const code = randomCode();
  const expiresAt = Date.now() + PAIR_CODE_TTL_MS;
  await getDB().settings.bulkPut([
    { key: PAIRING_KEYS.code, value: code },
    { key: PAIRING_KEYS.codeExpiresAt, value: expiresAt },
  ]);
  return code;
}

/** Le code encore valide, ou `null` s'il n'y en a pas / est expiré. */
export async function getActivePairingCode(): Promise<string | null> {
  const db = getDB();
  const [code, expiresAt] = await Promise.all([
    db.settings.get(PAIRING_KEYS.code),
    db.settings.get(PAIRING_KEYS.codeExpiresAt),
  ]);
  const raw = code?.value as string | undefined;
  if (!raw) return null;
  const exp = typeof expiresAt?.value === "number" ? expiresAt.value : 0;
  return exp > Date.now() ? raw : null;
}

/** Fin de validité du code courant (ms), pour l'UI « reste 8 min ». */
export async function pairCodeExpiry(): Promise<number | null> {
  const row = await getDB().settings.get(PAIRING_KEYS.codeExpiresAt);
  return typeof row?.value === "number" ? row.value : null;
}

/** Retire le code courant : le principal n'expose plus rien à saisir. */
export async function clearPairingCode(): Promise<void> {
  await getDB().settings.bulkDelete([PAIRING_KEYS.code, PAIRING_KEYS.codeExpiresAt]);
}

/**
 * L'appareil se présente au groupe (une seule fois). Sans compte partagé, rien à dire.
 * `pairCode` est le code saisi par l'écran qui rejoint ; le principal s'annonce sans code,
 * sa présence et son rôle suffisent. Appelable à tout moment — sans `pairCode` pour le
 * principal (bouton « Afficher le code de paire »), avec le code pour l'écran qui rejoint.
 */
export async function announceDevice(pairCode?: string): Promise<void> {
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) return;
  const db = getDB();
  if ((await db.settings.get(PAIRING_KEYS.announced))?.value === true) return;

  const profile = await getShopProfile();
  const payload = {
    device_id: identity.deviceId,
    public_key: getDeviceKeys().publicKey,
    employee_name: identity.employeeName || profile?.storeName?.trim() || "",
    role: identity.role,
    ...(pairCode ? { pair_code: pairCode.toUpperCase() } : {}),
  };
  await db.transaction("rw", [db.sync_ops, db.settings], async () => {
    await emitOp(db, identity, { type: "device.announce", entity_id: identity.deviceId, payload });
    await db.settings.put({ key: PAIRING_KEYS.announced, value: true });
  });
}

/**
 * Un écran rejoint le groupe en saisissant le code affiché par le principal.
 * Le format est vérifié ici ; la preuve, elle, est administrée chez le principal
 * à l'application de l'annonce (code local, comparé sans jamais être envoyé net).
 */
export async function enterPairingCode(input: string): Promise<"invalid" | "sent"> {
  const identity = await ensureIdentity();
  const code = normPairCode(input);
  // 6 caractères exacts : une saisie plus courte (un « 0/1/I/O » tombé hors du jeu de
  // caractères) ne peut PAS être une vraie preuve — refuser plutôt que d'annoncer un
  // code tronqué qui laisserait l'appareil `pending` sans erreur.
  if (code.length !== PAIR_CODE_LENGTH || !isSharedGroup(identity.shopId)) return "invalid";
  await announceDevice(code);
  return "sent";
}

/** Normalise une saisie : majuscules, seuls les caractères du jeu restent. */
export function normPairCode(input: string): string {
  const chars = new Set(CHARSET);
  return Array.from(input.toUpperCase())
    .filter((c) => chars.has(c))
    .join("");
}

/**
 * Approuve un appareil resté `pending` : il passe `paired` en local (le principal) et
 * l'op `device.approve` porte la décision aux autres écrans du groupe.
 */
export async function approveDevice(orgDeviceId: string, role: DeviceRole): Promise<void> {
  const identity = await ensureIdentity();
  const db = getDB();
  await db.transaction("rw", [db.paired_devices, db.sync_ops, db.settings], async () => {
    const existing =
      (await db.paired_devices.get(orgDeviceId)) ??
      ({
        id: orgDeviceId,
        shop_id: identity.shopId,
        updated_at: Date.now(),
      } satisfies PairedDevice);
    const now = Date.now();
    await db.paired_devices.put({
      ...existing,
      role,
      status: "paired",
      paired_at: existing.paired_at ?? now,
      updated_at: now,
    });
    await emitOp(db, identity, {
      type: "device.approve",
      entity_id: orgDeviceId,
      payload: { org_device_id: orgDeviceId, role },
    });
  });
}
