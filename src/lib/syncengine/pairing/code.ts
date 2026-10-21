import { getDB } from "../../db";
import { ensureIdentity, isSharedGroup } from "../identity";
import { PAIRING_KEYS } from "../types";
import { announceDevice } from "./announce";

/** 6 caractères sans ambiguité visuelle (pas de 0/O, 1/I, ni de lettres à géométrie proche). */
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIR_CODE_LENGTH = 6;
const PAIR_CODE_TTL_MS = 10 * 60_000;

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

/**
 * Le code de la SESSION en cours : UNE seule génération par ouverture de dialogue.
 *
 * Pourquoi : le dialogue QR peut déclencher son effet deux fois (double rendu React,
 * remontée d'état), et chaque passage sur `generatePairingCode` crée un code
 * DIFFÉRENT. Le patron se retrouvait alors avec un code affiché, un code stocké
 * localement et un code « frappé » au relais qui divergeaient — donc avec un code
 * qu'il ne reconnaissait jamais dans l'annonce de son employé. L'écran restait « à
 * approuver » et n'apparaissait jamais dans « Caisses synchronisées ».
 *
 * Le code de session est celui du store local : le QR, le jeton frappé au relais et
 * la preuve présentée par l'employé portent le MÊME.
 */
export async function sessionCode(current: string | null): Promise<string> {
  if (current) return current;
  return generatePairingCode();
}

/** Le code encore valide, ou `null` s'il n'y en a pas / est expiré. */
export async function getPairingToken(): Promise<string | null> {
  const db = getDB();
  const row = await db.settings.get(PAIRING_KEYS.code);
  const raw = row?.value as string | undefined;
  if (!raw) return null;
  const expRow = await db.settings.get(PAIRING_KEYS.codeExpiresAt);
  const exp = typeof expRow?.value === "number" ? expRow.value : 0;
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
 * Un écran rejoint le groupe en saisissant le code affiché par le principal.
 * Le format est vérifié ici ; la preuve, elle, est administrée chez le principal
 * à l'application de l'annonce (code local, comparé sans jamais être envoyé net).
 */
export async function enterPairingCode(input: string): Promise<"invalid" | "sent" | "error"> {
  const identity = await ensureIdentity();
  const code = normPairCode(input);
  // 6 caractères exacts : une saisie plus courte (un "0/1/I/O" tombé hors du jeu de
  // caractères) ne peut PAS être une vraie preuve — refuser plutôt que d'annoncer un
  // code tronqué qui laisserait l'appareil `pending` sans erreur.
  if (code.length !== PAIR_CODE_LENGTH || !isSharedGroup(identity.shopId)) return "invalid";

  try {
    await announceDevice(code);
    return "sent";
  } catch (err) {
    console.error("[enterPairingCode] Failed to announce device:", err);
    return "error";
  }
}

/** Normalise une saisie : majuscules, seuls les caractères du jeu restent. */
export function normPairCode(input: string): string {
  const chars = new Set(CHARSET);
  return Array.from(input.toUpperCase())
    .filter((c) => chars.has(c))
    .join("");
}
