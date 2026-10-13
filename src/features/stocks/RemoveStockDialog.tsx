import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { removeStock, type Product } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Retrait de stock (correction d'inventaire). `product` double comme drapeau d'ouverture. */
export function RemoveStockDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [removeQty, setRemoveQty] = useState("");

  useEffect(() => {
    setRemoveQty("");
  }, [product?.id]);

  const removeStockMut = useMutation({
    mutationFn: () => {
      if (!product) throw new Error("Produit introuvable.");
      const qty = Number(removeQty) || 0;
      if (qty <= 0) throw new Error("Quantité invalide.");
      return removeStock(product.id, qty);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success(`${updated.name} : retrait enregistré (total ${updated.stock})`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={product !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Retirer du stock</DialogTitle>
        </DialogHeader>
        {product && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">Stock actuel : {product.stock}</p>
            </div>
            <div>
              <Label htmlFor="remove-qty">Quantité retirée</Label>
              <Input
                id="remove-qty"
                inputMode="numeric"
                value={removeQty}
                onChange={(e) => setRemoveQty(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="mt-1.5 h-11 text-lg font-bold text-center"
                autoFocus
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Nouveau stock</p>
              <p className="text-lg font-bold tabular-nums">
                {Math.max(0, product.stock - (Number(removeQty) || 0))}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={!product || !(Number(removeQty) > 0) || removeStockMut.isPending}
            onClick={() => removeStockMut.mutate()}
          >
            {removeStockMut.isPending ? "…" : "Retirer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
