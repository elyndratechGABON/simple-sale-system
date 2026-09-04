import { useState } from "react";
import { getIdentity } from "@/lib/syncengine/identity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { applyClosingImport, parseClosingPayload } from "@/lib/restitution";
import { ScanLine } from "lucide-react";

interface EmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog « Employés » (owner) : scan d'un QR de clôture d'employé pour importer ses
 *  ventes agrégées dans la caisse du propriétaire. */
export function EmployeesDialog({ open, onOpenChange }: EmployeesDialogProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { startScan, scanning } = useBarcodeScanner();

  const handleImport = async () => {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>Gestion des employés</DialogTitle>
          <DialogDescription>
            Scannez le QR de clôture d'un employé pour importer ses ventes dans cette caisse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button variant="default" disabled={scanning} onClick={handleImport} className="w-full">
            <ScanLine className="mr-2 h-4 w-4" />
            {scanning ? "Scan en cours…" : "Importer une clôture (scanner QR)"}
          </Button>
          {message && <div className="p-3 rounded bg-primary/10 text-primary">{message}</div>}
          {error && <div className="p-3 rounded bg-red-50 text-red-700">{error}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
