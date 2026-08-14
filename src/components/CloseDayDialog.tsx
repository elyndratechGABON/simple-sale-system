// Dialogue de clôture de journée, partagé entre la caisse et les rapports : la clôture
// se décide sur le TOTAL du jour, pas sur un oui aveugle. Le `confirm()` du navigateur
// qu'il remplace n'affichait pas ce montant.
import { Lock } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CloseDayDialog({
  open,
  onOpenChange,
  salesCount,
  total,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  salesCount: number;
  total: number;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clôturer la journée ?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Total encaissé aujourd'hui :{" "}
            <span className="font-bold text-foreground tabular-nums">{formatFCFA(total)}</span> ·{" "}
            {salesCount} vente{salesCount > 1 ? "s" : ""}.
          </p>
          <p className="text-muted-foreground">
            Après la clôture, les ventes d'aujourd'hui ne pourront plus être annulées.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={busy || salesCount === 0} onClick={onConfirm}>
            <Lock className="h-4 w-4 mr-2" /> Clôturer la journée
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
