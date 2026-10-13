/** Callback d'arrêt du scan en cours (posé par `startScannerWithOverlay`, appelé par
 *  le cleanup du hook si le composant se démonte en pleine passe). */
let activeStop: (() => void) | null = null;

export function setActiveStop(stop: (() => void) | null) {
  activeStop = stop;
}

/** Arrêt programmatique du scan en cours (cf. cleanup du hook). */
export function stopActive() {
  activeStop?.();
  activeStop = null;
}

/** Arrête proprement un scanner html5-qrcode quel que soit son état.
 *  `Html5Qrcode.stop()` JETTE SYNCHRONIQUEMENT une string dès que le flux n'est pas
 *  démarré (html5-qrcode.ts:548) — un `.catch()` attaché à la promesse ne rattrape que
 *  les rejets, pas les throws. Sans ce garde-fou, démonter le composant en pleine passe
 *  (navigation pendant un refus caméra…) faisait jeter le cleanup du hook, et React
 *  envoyait la route entière à l'error boundary. */
export async function stopHtml5(scanner: import("html5-qrcode").Html5Qrcode | null) {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    // Flux non démarré : rien à arrêter.
  }
  try {
    scanner.clear();
  } catch {
    // Élément déjà nettoyé.
  }
}

/** Largeur de fenêtre accordée à getUserMedia avant de déclarer la caméra bloquée. */
const CAMERA_TIMEOUT_MS = 10_000;

/** Rend la promesse mais échoue au bout de `ms` si elle n'a pas résolu. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
    );
  });
}

/** Ouvre la caméra dans le geste utilisateur puis la relâche aussitôt. Le but n'est pas
 *  le flux, c'est l'ACQUISITION de la permission : une fois accordée, le démarrage
 *  html5-qrcode qui suit résout en quelques millisecondes, sans re-prompt. */
export async function acquireWebStream() {
  const tryStart = (constraints: MediaStreamConstraints) =>
    withTimeout(
      navigator.mediaDevices.getUserMedia(constraints),
      CAMERA_TIMEOUT_MS,
      "Impossible d'accéder à la caméra (délai dépassé). Fermez les autres applications qui l'utilisent, puis réessayez.",
    );
  let stream: MediaStream;
  try {
    // Caméra ARRIÈRE d'abord (le QR est tenu par l'autre caisse).
    stream = await tryStart({ video: { facingMode: "environment" } });
  } catch (err) {
    // Contrainte injoignable (surface, tablette…) → n'importe quelle caméra.
    if (/overconstrained|notfound|facingmode/i.test(String((err as Error)?.message ?? ""))) {
      stream = await tryStart({ video: true });
    } else {
      throw err;
    }
  }
  // Permission obtenue : on relâche le flux, html5-qrcode le rouvrira sans prompt.
  stream.getTracks().forEach((track) => track.stop());
}

/** Traduit les erreurs brutes de getUserMedia / html5-qrcode en messages actionnables. */
export function toCameraError(err: unknown): Error {
  const raw = String((err as Error)?.message ?? err ?? "");
  if (/permission|notallowed|denied|refus/i.test(raw)) {
    return new Error(
      "Accès à la caméra refusé. Touchez l'icône 🔒/ⓘ dans la barre d'adresse (ou Réglages → Applications), autorisez la caméra pour ce site, puis réessayez.",
    );
  }
  if (/notfound|no ?camera|device not found/i.test(raw)) {
    return new Error("Aucune caméra utilisable n'a été détectée sur cet appareil.");
  }
  if (/notreadable|track ?start|could not start|busy|déjà utilis/i.test(raw)) {
    return new Error(
      "La caméra est déjà utilisée par une autre application. Fermez-la, puis réessayez.",
    );
  }
  if (/overconstrained|facingmode/i.test(raw)) {
    return new Error(
      "Caméra arrière introuvable sur cet appareil — la frontale sera utilisée au prochain essai.",
    );
  }
  if (/secure|https/i.test(raw)) {
    return new Error("La caméra exige une connexion sécurisée (HTTPS).");
  }
  return new Error(`Caméra indisponible${raw ? ` — ${raw.slice(0, 140)}` : ""}.`);
}
