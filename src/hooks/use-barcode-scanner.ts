import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scanner de code-barres / QR cross-platform, avec APERÇU VISIBLE.
 *
 * - Web : `Html5Qrcode` de `html5-qrcode` (import dynamique pour ne pas gonfler le
 *   bundle initial), rendu dans une superposition plein écran avec bouton Annuler.
 * - Capacitor : même librairie dans le WebView — qui exige la permission native
 *   CAMERA dans AndroidManifest.xml, sinon getUserMedia ne répond jamais et le
 *   cadre reste noir (corrigé côté manifest).
 *
 * Pourquoi une superposition visible plutôt qu'une vidéo cachée : les navigateurs
 * mobiles ne rendent pas un flux caméra hors écran, et Safari n'accorde la caméra
 * que dans la fenêtre d'activation qui suit un geste — d'où le préchargement du
 * module au montage : au clic, l'import est déjà résolu et `start()` part
 * immédiatement.
 *
 * Durcissement « écran noir » : pré-vol du contexte sécurisé, ATTENTE réelle de
 * `start()` (les erreurs remontent au lieu de laisser un cadre noir), délai
 * maximal de 10 s, et statuts visibles (« Demande d'accès… », « Caméra active »).
 * En cas d'échec, l'erreur rejetée est en français et actionnable — l'appelant
 * affiche un toast et la saisie manuelle téléphone+mot de passe reste possible.
 */
export function useBarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const scanningRef = useRef(false);

  // Préchargement : le premier import (lourd) part sans attendre le clic.
  useEffect(() => {
    void import("html5-qrcode");
  }, []);

  const startScan = useCallback(async (): Promise<string | null> => {
    if (scanningRef.current) return null;

    // Pré-vol : sans HTTPS (ou localhost/app installée), aucun navigateur n'expose
    // la caméra. Échec immédiat et explicite plutôt qu'un cadre noir silencieux.
    if (
      typeof window === "undefined" ||
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        "La caméra exige une connexion sécurisée : ouvrez l'application en HTTPS (ou via l'application installée), puis réessayez.",
      );
    }

    scanningRef.current = true;
    setScanning(true);

    // Superposition construite AVANT tout await : elle existe déjà quand la caméra
    // démarre, et son bouton Annuler peut trancher à tout moment.
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
    hint.style.cssText = "color:#fff;font-size:14px;margin:0;text-align:center";
    hint.textContent = "Demande d'accès à la caméra…";
    const status = document.createElement("p");
    status.style.cssText =
      "color:rgba(255,255,255,.65);font-size:12px;margin:0;text-align:center;padding:0 24px";
    status.textContent = "Si rien ne se passe, vérifiez l'autorisation caméra.";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.style.cssText =
      "color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.4);" +
      "border-radius:10px;padding:10px 28px;font-size:14px;cursor:pointer";
    cancelBtn.textContent = "Annuler";
    overlay.append(frame, hint, status, cancelBtn);
    document.body.appendChild(overlay);

    const teardown = () => {
      overlay.remove();
      scanningRef.current = false;
      setScanning(false);
    };

    let resolveDecoded!: (value: string) => void;
    const decoded = new Promise<string>((resolve) => {
      resolveDecoded = resolve;
    });
    const cancelled = new Promise<null>((resolve) => {
      cancelBtn.addEventListener("click", () => resolve(null), { once: true });
    });

    // Le qrbox doit tenir DANS le cadre, lui-même borné par le petit côté de
    // l'écran : 250 px fixes débordaient sous ~340 px de large.
    const qrBoxSize = Math.max(
      140,
      Math.min(240, Math.floor(Math.min(window.innerWidth * 0.7, window.innerHeight * 0.45))),
    );

    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode(frame.id);

      // ATTENTE RÉELLE de start() : sa résolution garantit un flux caméra vivant.
      // Avant, la promesse était lancée sans être attendue — toute erreur passait
      // inaperçue derrière le cadre noir.
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              "Impossible d'accéder à la caméra (délai dépassé). Fermez les autres applications qui l'utilisent, puis réessayez.",
            ),
          );
        }, 10_000);
      });
      await Promise.race([
        scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: qrBoxSize, height: qrBoxSize } },
          (decodedText) => resolveDecoded(decodedText),
          () => {},
        ),
        timeout,
      ]);

      hint.textContent = "Cadrez le code QR dans le cadre";
      status.textContent = "Caméra active";

      return await Promise.race([decoded, cancelled]);
    } catch (err) {
      throw toCameraError(err);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      // Quelle que soit l'issue (lecture, annulation, erreur), la caméra est rendue.
      if (scanner) {
        await scanner.stop().catch(() => {});
        scanner.clear();
      }
      teardown();
    }
  }, []);

  return { scanning, startScan };
}

/** Traduit les erreurs brutes de getUserMedia / html5-qrcode en messages actionnables. */
function toCameraError(err: unknown): Error {
  const raw = String((err as Error)?.message ?? err ?? "");
  if (/permission|notallowed|denied|refus/i.test(raw)) {
    return new Error(
      "Accès à la caméra refusé. Autorisez-la pour ce site (ou pour l'application), puis réessayez.",
    );
  }
  if (/notfound|no ?camera|device not found|overconstrained/i.test(raw)) {
    return new Error("Aucune caméra utilisable n'a été détectée sur cet appareil.");
  }
  if (/secure|https/i.test(raw)) {
    return new Error("La caméra exige une connexion sécurisée (HTTPS).");
  }
  return new Error(`Caméra indisponible${raw ? ` — ${raw.slice(0, 140)}` : ""}.`);
}
