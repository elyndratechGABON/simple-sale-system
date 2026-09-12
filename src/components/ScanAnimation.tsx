import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnimatedScanProps {
  isScanning: boolean;
  scannedData: { phone: string; name: string } | null;
}

export function AnimatedScan({ isScanning, scannedData }: AnimatedScanProps) {
  if (!isScanning && !scannedData) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {isScanning ? (
          <>
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/30"></div>
              <div className="absolute inset-0 animate-ping rounded-full border-4 border-primary"></div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Scan en cours…</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">QR scanné avec succès</p>
              <p className="text-xs text-muted-foreground">Création de l'espace employé…</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Composant pour la fenêtre de confirmation propriétaire
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmStockImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  onConfirm: () => void;
}

export function ConfirmStockImport({
  open,
  onOpenChange,
  storeName,
  onConfirm,
}: ConfirmStockImportProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer le stock vers {storeName}</DialogTitle>
          <DialogDescription>
            L'employé attend la confirmation pour recevoir le catalogue complet. L'import inclura
            tous les produits et les stocks actuels.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button onClick={onConfirm}>Confirmer l'import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
