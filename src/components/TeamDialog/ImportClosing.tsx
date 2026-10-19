import { useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { applyClosingImport, parseClosingPayload } from "@/lib/restitution";
import { getIdentity } from "@/lib/syncengine/identity";

/** Import d'une clôture d'employé par QR, posé en bas de la fiche Équipe : l'employé
 *  règle ses ventes sur sa caisse, le patron scanne son QR pour les agréger chez lui. */
export function ImportClosing() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { startScan, scanning } = useBarcodeScanner();

  async function handleImport() {
    setError(null);
    setMessage(null);
    const text = await startScan();
    if (!text) return; // annulé
    try {
      const payload = parseClosingPayload(text);
      if (!payload) {
        setError("QR de clôture invalide.");
        return;
      }
      const identity = await getIdentity();
      const result = await applyClosingImport(payload, identity.deviceId);
      if (result.status === "imported") {
        setMessage(
          `Clôture importée : ${result.closing.revenue} F CFA de CA, ${result.closing.salesCount} vente(s).`,
        );
      } else if (result.status === "duplicate") {
        setMessage("Clôture déjà importée (doublon ignoré).");
      } else {
        setError(result.reason);
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'importation.");
    }
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Clôture d'un employé</p>
      <Button
        variant="outline"
        className="w-full"
        disabled={scanning}
        onClick={() => void handleImport()}
      >
        <ScanLine className="mr-2 h-4 w-4" />
        {scanning ? "Scan en cours…" : "Importer une clôture (scanner QR)"}
      </Button>
      {message && <div className="rounded bg-primary/10 p-2 text-xs text-primary">{message}</div>}
      {error && (
        <div className="rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
