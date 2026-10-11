"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface CatalogueRequestConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requesterId: string;
  onConfirm: () => void;
  onDeny: () => void;
}

export function CatalogueRequestConfirmDialog({
  open,
  onOpenChange,
  requesterId,
  onConfirm,
  onDeny,
}: CatalogueRequestConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Focus trap pour l'accessibilité
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onOpenChange(false);
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onOpenChange]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    try {
      await onDeny();
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Demande d'import de stock
          </DialogTitle>
          <DialogDescription>
            L'écran <strong>{requesterId.slice(0, 8)}...</strong> demande d'importer votre stock.
            <br />
            Voulez-vous autoriser le transfert ?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="destructive"
            onClick={handleDeny}
            disabled={loading}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Refuser
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Autoriser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}