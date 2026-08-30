import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scanner de code-barres / QR cross-platform, avec APERÇU VISIBLE.
 *
 * - Web : `Html5Qrcode` de `html5-qrcode` (import dynamique), rendu dans une
 *   superposition plein écran avec boutons Annuler / Réessayer.
 * - Capacitor : même librairie dans le WebView — qui exige la permission native
 *   CAMERA (demandée ici par `Camera.requestPermissions()`), sinon getUserMedia ne
 *   répond jamais et le cadre reste noir.
 *
 * « Peu importe le mobile » : chaque clic de retry relance `requestCameraActivation()`
 * sur un geste utilisateur frais — le prompt natif Android/iOS re-s'ouvre, et le web
 * re-sonde navigator.permissions. Un refus persistant ne peut être levé que par l'UI
 * du navigateur (icône en barre d'adresse) ou les réglages système : l'erreur affichée
 * l'explique exactement, puis on peut réessayer sans quitter l'écran.
 *
 * Deux garanties supplémentaires :
 *  - la PREMIÈRE activation part dans le geste de clic lui-même, avant tout await
 *    (l'import dynamique et le démarrage du flux attendent derrière) — le prompt natif
 *    n'est plus décalé d'un tick ;
 *  - si le composant qui héberge le scan est démonté en pleine passe (navigation),
 *    `activeStop` arrête le flux, retire la superposition et fait résoudre `null` :
 *    jamais d'overlay orphelin ni de `scanning` bloqué.
 */

/** Callback d'arrêt du scan en cours (posé par `startScannerWithOverlay`, appelé par
 * le cleanup du hook si le composant se démonte en pleine passe). */
let activeStop: (() => void) | null = null;

/** Arrête proprement un scanner html5-qrcode quel que soit son état.
 *  `Html5Qrcode.stop()` JETTE SYNCHRONIQUEMENT une string dès que le flux n'est pas
 *  démarré (html5-qrcode.ts:548) — un `.catch()` attaché à la promesse ne rattrape que
 *  les rejets, pas les throws. Sans ce garde-fou, démonter le composant en pleine passe
 *  (navigation pendant un refus caméra…) faisait jeter le cleanup du hook, et React
 *  envoyait la route entière à l'error boundary. */
async function stopHtml5(scanner: import("html5-qrcode").Html5Qrcode | null) {
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

export interface CameraAccess {
  available: boolean;
  denied: boolean;
  platform: "native" | "web";
  /** Instruction précise à afficher quand l'accès est impossible. */
  fix: string | null;
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
async function acquireWebStream() {
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

/**
 * Déclenche la demande d'activation de la caméra, quel que soit le support.
 * À appeler DEPUIS un geste utilisateur (clic) : c'est cette fenêtre d'activation
 * qui autorise le prompt `getUserMedia` sur mobile.
 */
export async function requestCameraActivation(): Promise<CameraAccess> {
  // Pré-vol : sans contexte sécurisé, aucun navigateur n'expose la caméra.
  const insecure =
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !navigator.mediaDevices?.getUserMedia;
  if (insecure) {
    const onHttp =
      typeof location !== "undefined" && location.protocol === "http:" && !!location.host;
    return {
      available: false,
      denied: true,
      platform: "web",
      fix: onHttp
        ? `La caméra ne peut pas se lancer depuis « ${location.host} » (adresse http). Ouvrez l'application via son adresse https://, ou installez-la, puis réessayez.`
        : "La caméra exige une connexion sécurisée : ouvrez l'application en HTTPS (ou via l'application installée), puis réessayez.",
    };
  }

  // Native (Capacitor) : le dialogue système s'ouvre à la demande.
  if (Capacitor.isNativePlatform()) {
    const status = await Camera.checkPermissions();
    if (status.camera === "granted")
      return { available: true, denied: false, platform: "native", fix: null };
    const result = await Camera.requestPermissions();
    if (result.camera === "granted")
      return { available: true, denied: false, platform: "native", fix: null };
    return {
      available: false,
      denied: true,
      platform: "native",
      fix:
        result.camera === "denied"
          ? "Autorisation caméra refusée. Ouvrez Réglages → Applications → Caisse → Autorisations, activez la caméra, puis touchez Réessayer."
          : "La caméra n'est pas utilisable sur cet appareil. Vérifiez ses réglages système, puis touchez Réessayer.",
    };
  }

  // Web (iOS surtout) : le prompt `getUserMedia` ne naît que s'il est retenu DANS la
  // fenêtre d'activation du geste. Tout `await` avant lui (import encore en cours de
  // cache, autre micro-tâche) suffit à l'écraser : au 1er essai à froid, iOS ne montre
  // aucun prompt et échoue en silence. On ouvre donc réellement la caméra ICI, dans le
  // geste, puis on relâche le flux — la permission est acquise et le `scanner.start()`
  // suivant (html5-qrcode fait son propre getUserMedia) obtient le flux sans prompt.
  try {
    await acquireWebStream();
    return { available: true, denied: false, platform: "web", fix: null };
  } catch (err) {
    const classified = toCameraError(err);
    const name = String((err as { name?: string })?.name ?? "");
    const denied =
      /notallowed|permission|denied|security/i.test(name) ||
      /permission|denied|refus/i.test(classified.message);
    return { available: false, denied, platform: "web", fix: classified.message };
  }
}

/**
 * Une passe entière de scan, superposition comprise. Chaque itération de la boucle
 * correspond à UNE demande d'activation : en cas de refus, l'utilisateur peut
 * « Réessayer la caméra » (nouvelle activation, peut-importe le mobile) ou Annuler.
 */
async function startScannerWithOverlay(): Promise<string | null> {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.85);" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;" +
    "font-family:system-ui,sans-serif";
  const frame = document.createElement("div");
  frame.id = `barcode-reader-${Date.now()}`;
  frame.style.cssText =
    "width:min(80vw,280px);aspect-ratio:1;border-radius:12px;overflow:hidden;background:#000";
  const hint = document.createElement("p");
  hint.style.cssText = "color:#fff;font-size:14px;margin:0;text-align:center;max-width:86vw";
  hint.textContent = "Demande d'accès à la caméra…";
  const status = document.createElement("p");
  status.style.cssText =
    "color:rgba(255,255,255,.65);font-size:12px;margin:0;text-align:center;padding:0 24px";
  status.textContent = "Si rien ne se passe, vérifiez l'autorisation caméra.";
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.style.cssText =
    "color:#fff;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);" +
    "border-radius:10px;padding:10px 22px;font-size:14px;cursor:pointer;display:none";
  retryBtn.textContent = "Réessayer la caméra";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.style.cssText =
    "color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.4);" +
    "border-radius:10px;padding:10px 28px;font-size:14px;cursor:pointer";
  cancelBtn.textContent = "Annuler";
  overlay.append(frame, hint, status, retryBtn, cancelBtn);
  document.body.appendChild(overlay);

  const teardown = () => overlay.remove();

  // Le qrbox doit tenir DANS le cadre, lui-même borné par le petit côté de l'écran.
  const qrBoxSize = Math.max(
    140,
    Math.min(240, Math.floor(Math.min(window.innerWidth * 0.7, window.innerHeight * 0.45))),
  );

  let resolveDecoded!: (value: string) => void;
  const decoded = new Promise<string>((resolve) => {
    resolveDecoded = resolve;
  });

  let scanner: import("html5-qrcode").Html5Qrcode | null = null;

  // Résolvants exposés à `stop` : quelque soit l'état (flux vivant, attente du choix
  // retry/annuler, démarrage en cours), l'arrêt programmatique doit pouvoir tout
  // dénouer proprement et faire renvoyer `null`.
  let resolveCancelled: (v: null) => void = () => {};
  const cancelled = new Promise<null>((resolve) => {
    resolveCancelled = resolve;
  });
  let resolveChoice: (v: "retry" | "cancel") => void = () => {};
  cancelBtn.addEventListener("click", () => resolveCancelled(null), { once: true });

  /** Arrêt demandé par le hook (démontage) : on dénoue la passe en cours et on nettoie.
   *  `scanner` et `overlay` sont fuités volontairement — la promesse rendue finit par
   *  `finally`, qui re-localise puis détruit proprement. */
  const stop = () => {
    resolveChoice("cancel");
    resolveCancelled(null);
    void stopHtml5(scanner);
    teardown();
  };
  activeStop = stop;

  const waitForChoice = () =>
    new Promise<"retry" | "cancel">((resolve) => {
      resolveChoice = resolve;
      const onRetry = () => {
        cleanup();
        resolve("retry");
      };
      const onCancel = () => {
        cleanup();
        resolve("cancel");
      };
      function cleanup() {
        retryBtn.removeEventListener("click", onRetry);
        cancelBtn.removeEventListener("click", onCancel);
      }
      retryBtn.addEventListener("click", onRetry, { once: true });
      cancelBtn.addEventListener("click", onCancel, { once: true });
    });

  const showError = (message: string) => {
    hint.style.display = "none";
    status.textContent = message;
    status.style.color = "#fca5a5";
    status.style.fontSize = "13px";
    retryBtn.style.display = "";
  };

  const resetStatus = () => {
    hint.style.display = "";
    hint.textContent = "Demande d'accès à la caméra…";
    status.style.color = "rgba(255,255,255,.65)";
    status.style.fontSize = "12px";
    status.textContent = "Si rien ne se passe, vérifiez l'autorisation caméra.";
    retryBtn.style.display = "none";
  };

  try {
    // 1. Activation caméra — COURUE DANS LE GESTE DE CLIC, avant tout import dynamique.
    //    Native, le prompt OS s'ouvre donc dans la fenêtre d'activation du clic ; web,
    //    `requestCameraActivation` OUVRE réellement la caméra ici pour acquérir la
    //    permission (puis la relâche), ce qui rend impossible l'échec silencieux iOS.
    const firstAccess = await requestCameraActivation();

    const { Html5Qrcode } = await import("html5-qrcode");
    scanner = new Html5Qrcode(frame.id);

    for (let pass = 0; ; pass++) {
      resetStatus();

      // 1 bis. Aux passes suivantes (`pass > 0`, « Réessayer »), on redemande une
      // activation — chaque retry est un geste frais qui rouvre le prompt.
      const access = pass === 0 ? firstAccess : await requestCameraActivation();
      if (access.denied || !access.available) {
        showError(access.fix ?? "Accès caméra refusé.");
        const choice = await waitForChoice();
        if (choice === "cancel") return null;
        continue;
      }

      // 2. Démarrage réel du flux : caméra ARRIÈRE d'abord, puis n'importe laquelle.
      const attempts: Array<{ facingMode: string }> = [
        { facingMode: "environment" },
        { facingMode: "user" },
      ];
      let started = false;
      let lastErr: unknown = null;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        for (const camera of attempts) {
          const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(
                new Error(
                  "Impossible d'accéder à la caméra (délai dépassé). Fermez les autres applications qui l'utilisent, puis réessayez.",
                ),
              );
            }, 10_000);
          });
          try {
            await Promise.race([
              scanner.start(
                camera,
                { fps: 10, qrbox: { width: qrBoxSize, height: qrBoxSize } },
                (decodedText) => resolveDecoded(decodedText),
                () => {},
              ),
              timeout,
            ]);
            started = true;
            break;
          } catch (e) {
            lastErr = e;
            const msg = String((e as Error)?.message ?? e ?? "");
            // Contrainte injoignable uniquement → tenter la caméra suivante.
            if (/overconstrained|notfound|no ?camera|facingmode|device not found/i.test(msg)) {
              continue;
            }
            throw e;
          } finally {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
          }
        }
        if (!started) throw lastErr ?? new Error("Caméra indisponible.");
      } catch (err) {
        await stopHtml5(scanner);
        showError(toCameraError(err).message);
        const choice = await waitForChoice();
        if (choice === "cancel") return null;
        continue;
      }

      // 3. Flux vivant : on attend un code ou l'annulation.
      hint.textContent = "Cadrez le code QR dans le cadre";
      status.textContent = "Caméra active";
      return await Promise.race([decoded, cancelled]);
    }
  } finally {
    activeStop = null;
    await stopHtml5(scanner);
    teardown();
  }
}

export function useBarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const scanningRef = useRef(false);

  // Préchargement : le premier import (lourd) part sans attendre le clic.
  useEffect(() => {
    void import("html5-qrcode");
  }, []);

  // Sécurité démontage : si le composant qui héberge le scan est retiré en pleine
  // passe (navigation), on arrête le flux, on retire la superposition et le scan
  // résout `null` — jamais d'overlay orphelin ni de `scanning` bloqué.
  useEffect(() => {
    return () => {
      activeStop?.();
      activeStop = null;
    };
  }, []);

  const startScan = useCallback(async (): Promise<string | null> => {
    if (scanningRef.current) return null;
    scanningRef.current = true;
    setScanning(true);
    try {
      return await startScannerWithOverlay();
    } finally {
      activeStop = null;
      scanningRef.current = false;
      setScanning(false);
    }
  }, []);

  return { scanning, startScan };
}

/** Traduit les erreurs brutes de getUserMedia / html5-qrcode en messages actionnables. */
function toCameraError(err: unknown): Error {
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
