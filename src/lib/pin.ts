// Code PIN d'annulation — la garde qui protège deux actions qui coûtent de l'argent :
// annuler une vente encaissée (avec restauration de stock) et annuler une table en cours.
//
// Ce n'est PAS une authentification, et le code ne prétend pas l'être : c'est un
// « bip de confirmation » posé devant un bouton destructeur, pour qu'un employé ne
// cliqué pas « annuler » par réflexe. La caisse n'a ni compte ni session : la donnée
// vit sur l'appareil, donc quiconque tient le téléphone est déjà l'exploitant. Ce que
// le module garantit, c'est qu'un clic involontaire ne suffit pas —
//
//  - aucun code par défaut (l'installateur en choisit un) ;
//  - le code n'est jamais stocké en clair ;
//  - une saisie + énumération est limitée dans le temps (une énumération des 10 000 codes à
//    4 chiffres ne doit pas être jouable en quelques minutes par un employé curieux).
//
// Garde-fous d'ERGONOMIE, à contraster avec une vraie authentification : la longueur
// n'est pas bornée, un code vide n'est pas accepté, et un oubli est cassé par
// `resetPin()` — l'effort est de ne jamais bloquer un commerçant par sa propre caisse.
const KEY_HASH = "pos_admin_pin_hash";
const KEY_TRIES = "pos_admin_pin_tries";
const KEY_LOCKED_UNTIL = "pos_admin_pin_locked_until";

/** Itérations PBKDF2. Assez pour que `localStorage` ne soit pas un dictionnaire. */
const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;

/** Tentatives avant blocage, et durée du blocage. */
const MAX_TRIES = 5;
const LOCKOUT_MS = 5 * 60_000;

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

/** Un code PIN a-t-il déjà été choisi sur cet appareil ? */
export function isPinSet(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(KEY_HASH) !== null;
}

/** Pose le code. Remplace un code existant sans demander l'ancien — la réinitialisation
 *  est un chemin de secours assumé (l'appareil est physiquement en main). */
export async function setPin(pin: string): Promise<void> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)).buffer);
  const hash = await derive(pin, salt);
  window.localStorage.setItem(KEY_HASH, `${salt}:${hash}`);
  clearPinThrottle();
}

/** Oublie le code et le compteur de tentatives. L'appareil rouvre alors la saisie d'un
 *  PIN neuf : faute de quoi un marchand qui l'a oublié ne pourrait plus annuler ses ventes. */
export function resetPin(): void {
  window.localStorage.removeItem(KEY_HASH);
  clearPinThrottle();
}

function clearPinThrottle(): void {
  window.localStorage.removeItem(KEY_TRIES);
  window.localStorage.removeItem(KEY_LOCKED_UNTIL);
}

/** Milliseconds restantes avant la fin du blocage — sert à griser la saisie. */
export function pinLockRemainingMs(): number {
  if (typeof window === "undefined") return 0;
  const until = Number(window.localStorage.getItem(KEY_LOCKED_UNTIL) ?? 0);
  return Math.max(0, until - Date.now());
}

/** Résultat d'une vérification : le motif est distinct de « mauvais code » pour que
 *  l'interface puisse proposer d'attendre plutôt que de ressaisir. */
export type PinResult = "ok" | "wrong" | "locked" | "unset";

/**
 * Vérifie le PIN saisi. Asynchrone (PBKDF2) et CONSTANTE dans le temps côté comparaison
 * — on compare les octets, sans court-circuit.
 *
 * Un PIN non choisi n'est pas « 1234 par défaut » : c'est `unset`, que l'interface
 * traite en demandant d'en créer un. Le défaut historique laissait 4 chiffres devinables
 * devant deux actions à effet financier.
 */
export async function verifyPin(input: string): Promise<PinResult> {
  if (typeof window === "undefined") return "unset";
  const stored = window.localStorage.getItem(KEY_HASH);
  if (!stored) return "unset";

  const locked = pinLockRemainingMs();
  if (locked > 0) return "locked";

  const [salt, expected] = stored.split(":") as [string, string];
  const actual = await derive(input.trim(), salt);
  if (timingSafeEqualHex(actual, expected)) {
    clearPinThrottle();
    return "ok";
  }

  const tries = Number(window.localStorage.getItem(KEY_TRIES) ?? 0) + 1;
  if (tries >= MAX_TRIES) {
    window.localStorage.setItem(KEY_TRIES, "0");
    window.localStorage.setItem(KEY_LOCKED_UNTIL, String(Date.now() + LOCKOUT_MS));
    return "locked";
  }
  window.localStorage.setItem(KEY_TRIES, String(tries));
  return "wrong";
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
