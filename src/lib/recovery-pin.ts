// Code PIN de RÉCUPÉRATION (mission sécurité — Étape 4.3).
//
// DEUX codes coexistent, et ils ne parlent PAS de la même chose :
//  - le PIN d'annulation (src/lib/pin.ts) protège les gestes destructeurs LOCAUX ;
//  - CE code est la clé du COMPTE : saisi sur un TÉLÉPHONE NEUF, il rattache
//    l'écran au compte et DÉCONNECTE l'ancien — c'est le filet du commerçant qui
//    change de portable sans passer par le QR.
//
// DÉFAUT `0010`, personnalisable. Stocké haché (PBKDF2-SHA256, sel aléatoire) —
// la même discipline que `pin.ts` : jamais en clair, un dictionnaire n'a rien à lire.
const KEY_HASH = "pos_recovery_pin_hash";

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;

export const DEFAULT_RECOVERY_PIN = "0010";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function derive(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return toHex(bits);
}

/** La boutique a-t-elle déjà posé SON code (personnalisé ou posé au premier boot) ? */
export function isRecoveryPinSet(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(KEY_HASH) !== null;
}

/** Pose (ou change) le code de récupération. Personnalisable — 4 chiffres similaires. */
export async function setRecoveryPin(pin: string): Promise<void> {
  const clean = pin.trim();
  if (!/^\d{4}$/.test(clean)) throw new Error("Code invalide : 4 chiffres.");
  const salt = toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)).buffer);
  const hash = await derive(clean, salt);
  window.localStorage.setItem(KEY_HASH, `${salt}:${hash}`);
}

/**
 * Garantit qu'un code est POSÉ : au premier lancement, la boutique reçoit le défaut
 * `0010` et peut le personnaliser à chaud. Idempotent — le code posé n'est JAMAIS
 * réécrasé par le défaut.
 */
export async function ensureRecoveryPin(): Promise<void> {
  if (isRecoveryPinSet()) return;
  await setRecoveryPin(DEFAULT_RECOVERY_PIN);
}

/** Vérifie le code saisi (synchronisé avec `pin.ts` : PBKDF2, non bloquant). */
export async function verifyRecoveryPin(input: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(KEY_HASH);
  if (!stored) return false;
  const [salt, expected] = stored.split(":") as [string, string];
  const actual = await derive(input.trim(), salt);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
