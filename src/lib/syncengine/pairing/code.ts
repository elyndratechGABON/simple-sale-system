import { getDB } from "../../db";
import { ensureIdentity, isSharedGroup } from "../identity";
import { PAIRING_KEYS, PAIR_CODE_PROOF_WINDOW_MS, RECENT_CODES_LIMIT } from "../types";
import { emitOp } from "../ops";
import { announceDevice } from "./announce";

/** 6 caractères sans ambiguité visuelle (pas de 0/O, 1/I, ni de lettres à géométrie proche). */
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIR_CODE_LENGTH = 6;
const PAIR_CODE_TTL_MS = 10 * 60_000;

/** Durée d'AFFICHATION d'un code au-dessus du QR (la PREUVE dure plus longtemps). */
export { PAIR_CODE_TTL_MS };

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
  const db = getDB();
  await db.settings.bulkPut([
    { key: PAIRING_KEYS.code, value: code },
    { key: PAIRING_KEYS.codeExpiresAt, value: expiresAt },
  ]);
  // Le code frappé est ajouté aux « codes récents » : c'est lui qui restera une preuve
  // d'invitation, même après l'expiration de l'affichage (cf. `knownPairCode`).
  await rememberRecentCode(code);
  return code;
}

/** Les codes frappés récemment, du plus ancien au plus récent. */
async function recentCodes(): Promise<{ code: string; at: number }[]> {
  const raw = (await getDB().settings.get(PAIRING_KEYS.recentCodes))?.value;
  return Array.isArray(raw) ? (raw as { code: string; at: number }[]) : [];
}

async function rememberRecentCode(code: string): Promise<void> {
  const db = getDB();
  const codes = await recentCodes();
  const kept = [...codes.filter((c) => c.code !== code), { code, at: Date.now() }].slice(
    -RECENT_CODES_LIMIT,
  );
  await db.settings.put({ key: PAIRING_KEYS.recentCodes, value: kept });
}

/**
 * Mémorise un code de paire comme PREUVE d'invitation, sans le poser comme code actif.
 *
 * Utilisé par l'EMPLOYÉ qui vient de le ressaisir (`announceDevice(code)`) : le code ne
 * sera jamais affiché ni r'uttilisable chez lui, mais il reste la preuve que SON
 * principal l'a invité dans la fenêtre (12 h). C'est elle qui fait accepter la
 * contre-annonce du propriétaire (cf. `exchangeOps`) — donc pincer SA clé publique, et
 * accepter ensuite TOUTES ses ops, `product.created` comprise.
 */
export async function rememberPairCodeProof(code: string): Promise<void> {
  if (!code) return;
  await rememberRecentCode(code);
}

/**
 * Ce code est-il une preuve d'invitation encore valable ?
 *
 * - le code ACTIF, tant qu'il n'a pas expiré (10 min) ;
 * - un code frappé récemment, dans la fenêtre de preuve (12 h) — le patron qui ouvre
 *   son application le lendemain matin reconnaît ainsi l'employé qui a scanné hier.
 *
 * L'affichage expire vite (le QR affiché au-dessus du code n'a pas à durer) ; la
 * preuve, elle, doit survivre au sommeil du téléphone.
 */
export async function knownPairCode(code: string | undefined | null): Promise<boolean> {
  if (!code) return false;
  const db = getDB();
  const [codeRow, expRow] = await Promise.all([
    db.settings.get(PAIRING_KEYS.code),
    db.settings.get(PAIRING_KEYS.codeExpiresAt),
  ]);
  const now = Date.now();
  if (codeRow?.value === code) {
    const exp = Number(expRow?.value ?? 0);
    // Le code affiché, encore valide.
    if (exp > now) return true;
    // Le code affiché, EXPIRÉ — mais émis récemment : c'est encore une preuve
    // d'invitation. Ce cas couvre les écrans qui n'ont pas encore la liste des codes
    // récents (installations antérieures à cette fenêtre).
    if (exp > 0 && now - (exp - PAIR_CODE_TTL_MS) <= PAIR_CODE_PROOF_WINDOW_MS) return true;
  }
  const codes = await recentCodes();
  return codes.some((c) => c.code === code && now - c.at <= PAIR_CODE_PROOF_WINDOW_MS);
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
