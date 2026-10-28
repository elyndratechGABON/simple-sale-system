import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addStock, type Product } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { StockPicker } from "./StockPicker";
import { StockDetailsForm } from "./StockDetailsForm";

/** Ajout de stock : sélecteur de produit et quantité, rien d'autre.
 *  L'état du formulaire est interne et se réinitialise à chaque ouverture. */
export function AddStockDialog({
  open,
  onOpenChange,
  seedProductId,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Produit pré-sélectionné à l'ouverture. `null` = ouvrir en mode recherche. */
  seedProductId: string | null;
  products: Product[];
}) {
  const qc = useQueryClient();
  const [stockProductId, setStockProductId] = useState("");
  const [addQty, setAddQty] = useState("");

  useEffect(() => {
    if (!open) return;
    setStockProductId(seedProductId ?? "");
    setAddQty("");
  }, [open, seedProductId]);

  const selectedProduct = products.find((p) => p.id === stockProductId) ?? null;

  const addStockMut = useMutation({
    mutationFn: () => {
      if (!selectedProduct) throw new Error("Sélectionnez un produit.");
      const qty = Number(addQty) || 0;
      if (qty <= 0) throw new Error("Quantité invalide.");
      return addStock(selectedProduct.id, qty);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success(`${updated.name} : +${addQty} (total ${updated.stock})`);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <div className="space-y-4">
          {!selectedProduct ? (
            <StockPicker products={products} onSelect={setStockProductId} />
          ) : (
            <StockDetailsForm
              product={selectedProduct}
              addQty={addQty}
              onQtyChange={setAddQty}
              onBack={() => {
                setStockProductId("");
                setAddQty("");
              }}
              onSubmit={() => addStockMut.mutate()}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => addStockMut.mutate()}
            disabled={!selectedProduct || !addQty || Number(addQty) <= 0 || addStockMut.isPending}
            aria-busy={addStockMut.isPending}
          >
            {addStockMut.isPending ? "Ajout…" : "Ajouter au stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
