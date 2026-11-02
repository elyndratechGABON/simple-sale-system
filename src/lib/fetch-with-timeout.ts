/**
 * fetch avec TIMEOUT, pour ne jamais tourner dans le vide.
 *
 * Un fetch sans signal peut rester « pending » indéfiniment : réseau qui s'effondre
 * en cours de route (Wi-Fi captif, bascule 4G), orchestrateur qui redémarre — la
 * promesse ne se rejette JAMAIS, l'interface attend un toast qui ne viendra pas et
 * l'utilisateur voit l'application « morte » sans savoir pourquoi.
 *
 * `AbortSignal.timeout` (natif, tous navigateurs récents) coupe au délai : l'erreur
 * qui en résulte est un `TimeoutError` de type `DOMException` (ou `AbortError` selon
 * les moteurs) — `isTimeoutError` les distingue d'un vrai refus serveur pour que
 * l'appelant affiche le bon message.
 *
 * Le timeout est remisé dans `finally` : sans lui, chaque appel laissait fuir un
 * timer ouvert pendant la durée restante du programme.
 */

/** Délai par défaut : 15 s. Les handlers orchestrateur répondent en < 2 s ;
 *  au-delà, c'est un réseau cassé, pas une file d'attente. */
export const FETCH_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  // Un appelant qui fournit déjà un signal garde la main (ex: un composant qui
  // abandonne un téléchargement) : on ne l'écrase pas.
  const signal = options.signal ?? AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(url, { ...options, signal });
  } finally {
    /* rien : AbortSignal.timeout est autodestructif */
  }
}

/** L'erreur vient-elle d'un TIMEOUT (et pas d'un refus serveur, d'un CORS,
 *  d'une coupure franche) ? Couvre `TimeoutError` (standard) et les variantes
 *  `AbortError` que certains moteurs ont émises pour le même geste. */
export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === "TimeoutError" || error.name === "AbortError";
}

/** Message utilisateur prêt pour un toast : distinct d'un serveur injoignable. */
export function timeoutMessage(): string {
  return "Le serveur met trop de temps à répondre. Vérifiez votre connexion.";
}
