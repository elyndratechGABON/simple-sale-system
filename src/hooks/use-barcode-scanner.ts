import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scanner de code-barres / QR cross-platform, avec APERÇU VISIBLE.
 *
 * - Web : `Html5Qrcode` de `html5-qrcode` (import dynamique pour ne pas gonfler le
 *   bundle initial), rendu dans une superposition plein écran avec bouton Annuler.
 * - Capacitor : même librairie dans le WebView, pas besoin du plugin natif.
 *
 * Pourquoi une superposition visible plutôt qu'une vidéo cachée : les navigateurs
 * mobiles ne rendent pas un flux caméra hors écran (l'utilisateur ne voit « rien »),
 * et Safari n'accorde la caméra que dans la fenêtre d'activation qui suit un geste —
 * d'où le préchargement du module au montage : au clic, l'import est déjà résolu et
 * `start()` part immédiatement.
 *
 * Résout le texte décodé ; `null` si annulé ; rejette si la caméra est refusée ou
 * indisponible (l'appelant affiche l'erreur).
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
    scanningRef.current = true;
    setScanning(true);

    // Superposition construite AVANT tout await : elle existe déjà quand la caméra
    // démarre, et son bouton Annuler peut trancher la course à tout moment.
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
    hint.textContent = "Cadrez le code QR dans le cadre";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.style.cssText =
      "color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.4);" +
      "border-radius:10px;padding:10px 28px;font-size:14px;cursor:pointer";
    cancelBtn.textContent = "Annuler";
    overlay.append(frame, hint, cancelBtn);
    document.body.appendChild(overlay);

    const teardown = () => {
      overlay.remove();
      scanningRef.current = false;
      setScanning(false);
    };

    let resolveDecoded!: (value: string) => void;
    let rejectCamera!: (reason: unknown) => void;
    const decoded = new Promise<string>((resolve, reject) => {
      resolveDecoded = resolve;
      rejectCamera = reject;
    });
    const cancelled = new Promise<null>((resolve) => {
      cancelBtn.addEventListener("click", () => resolve(null), { once: true });
    });

    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode(frame.id);
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => resolveDecoded(decodedText),
          () => {},
        )
        .catch((err: unknown) => {
          rejectCamera(err instanceof Error ? err : new Error("Caméra indisponible"));
        });

      const result = await Promise.race([decoded, cancelled]);
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Erreur inconnue lors du scan");
    } finally {
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
