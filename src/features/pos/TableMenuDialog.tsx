import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatFCFA } from "@/lib/format";
import type { Sale } from "@/lib/db";

interface TableMenuDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableLabel: string;
  sale: Sale | null;
  onCreateBill: () => void;
  onAddProducts: () => void;
  onCheckout: () => void;
}

export function TableMenuDialog({
  open,
  onOpenChange,
  tableLabel,
  sale,
  onCreateBill,
  onAddProducts,
  onCheckout,
}: TableMenuDialogProps) {
  if (!open) return null;

  const total = sale?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Table {tableLabel}</span>
            {sale && (
              <span className="text-sm font-medium text-primary tabular-nums ml-2">
                {formatFCFA(total)}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {sale ? "Cette table a une addition en cours." : "Cette table est libre."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {sale === null ? (
            <Button
              className="w-full h-12 gap-2"
              onClick={() => {
                onOpenChange(false);
                onCreateBill();
              }}
            >
              <span className="h-5 w-5">+</span>
              Créer une facture
            </Button>
          ) : (
            <>
              <Button
                className="w-full h-12 gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onAddProducts();
                }}
              >
                <span className="h-5 w-5 mr-2">+</span>
                Ajouter des produits
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onCheckout();
                }}
              >
                <span className="h-5 w-5 mr-2">💳</span>
                Encaisser {formatFCFA(total)}
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
