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
 */

export interface CameraAccess {
  available: boolean;
  denied: boolean;
  platform: "native" | "web";
  /** Instruction précise à afficher quand l'accès est impossible. */
  fix: string | null;
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

  // Web : on ne peut PAS forcer un nouveau prompt une fois la permission bloquée.
  // On lit l'état ; 'denied' → instruction exacte (seul l'UI navigateur débloque).
  try {
    const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
    if (perm.state === "denied") {
      return {
        available: false,
        denied: true,
        platform: "web",
        fix: "Caméra bloquée pour ce site. Touchez l'icône 🔒/ⓘ dans la barre d'adresse → Autorisations du site → Appareil photo → Autoriser (ou « Réinitialiser les autorisations »), rechargez, puis touchez Réessayer.",
      };
    }
    // 'prompt' ou 'granted' : le getUserMedia déclenché par le clic ouvrira le prompt.
    return { available: true, denied: false, platform: "web", fix: null };
  } catch {
    // API indisponible (Safari iOS…) : on laisse getUserMedia décider au démarrage.
    return { available: true, denied: false, platform: "web", fix: null };
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
  const cancelled = new Promise<null>((resolve) => {
    cancelBtn.addEventListener("click", () => resolve(null), { once: true });
  });

  const waitForChoice = () =>
    new Promise<"retry" | "cancel">((resolve) => {
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

  let scanner: import("html5-qrcode").Html5Qrcode | null = null;
  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    scanner = new Html5Qrcode(frame.id);

    for (;;) {
      resetStatus();

      // 1. Activation caméra (native ou web) — relancée à chaque passe.
      const access = await requestCameraActivation();
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
        await scanner.stop().catch(() => {});
        scanner.clear();
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
    if (scanner) {
      await scanner.stop().catch(() => {});
      scanner.clear();
    }
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

  const startScan = useCallback(async (): Promise<string | null> => {
    if (scanningRef.current) return null;
    scanningRef.current = true;
    setScanning(true);
    try {
      return await startScannerWithOverlay();
    } finally {
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
