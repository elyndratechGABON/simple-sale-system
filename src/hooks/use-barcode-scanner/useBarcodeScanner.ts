import { useCallback, useEffect, useRef, useState } from "react";
import { setActiveStop, stopActive } from "./internal";
import { startScannerWithOverlay } from "./scanner-overlay";

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
      stopActive();
    };
  }, []);

  const startScan = useCallback(async (): Promise<string | null> => {
    if (scanningRef.current) return null;
    scanningRef.current = true;
    setScanning(true);
    try {
      return await startScannerWithOverlay();
    } finally {
      setActiveStop(null);
      scanningRef.current = false;
      setScanning(false);
    }
  }, []);

  return { scanning, startScan };
}
