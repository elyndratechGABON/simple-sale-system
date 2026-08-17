import { useCallback, useRef, useState } from "react";

/**
 * Scanner de code-barres cross-platform.
 *
 * - Web : `Html5Qrcode` de `html5-qrcode` (import dynamique pour ne pas gonfler le bundle initial).
 * - Capacitor : même librairie fonctionne dans le WebView, pas besoin du plugin natif.
 *
 * Le scan est async et ne bloque pas l'interface : le bouton affiche un état de chargement
 * pendant que la caméra s'ouvre. L'annulation résout `null`, une erreur caméra rejette.
 */
export function useBarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const scanningRef = useRef(false);
  const instanceRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const startScan = useCallback(async (): Promise<string | null> => {
    if (scanningRef.current) return null;
    scanningRef.current = true;
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const containerId = `barcode-reader-${Date.now()}`;
      const container = document.createElement("div");
      container.id = containerId;
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.width = "1px";
      container.style.height = "1px";
      document.body.appendChild(container);

      const html5Qrcode = new Html5Qrcode(containerId);
      instanceRef.current = { stop: () => html5Qrcode.stop() };

      const code = await new Promise<string | null>((resolve, reject) => {
        html5Qrcode
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              html5Qrcode.stop().catch(() => {});
              resolve(decodedText);
            },
            () => {},
          )
          .catch((err: unknown) => {
            // Caméra refusée ou indisponible — propager l'erreur
            reject(err instanceof Error ? err : new Error("Caméra indisponible"));
          });
      });

      return code;
    } catch (err) {
      // Re-lancer pour que l'appelant puisse afficher un toast
      throw err instanceof Error ? err : new Error("Erreur inconnue lors du scan");
    } finally {
      const el = instanceRef.current as unknown as HTMLElement | null;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      instanceRef.current = null;
      scanningRef.current = false;
      setScanning(false);
    }
  }, []);

  return { scanning, startScan };
}
