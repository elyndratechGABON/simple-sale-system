import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isWeightProduct, filterQtyInput, parseQty } from "@/lib/pos-quantity";
import type { PosController } from "./usePos";

/**
 * Saisie manuelle de la quantité (appui long sur une carte). Vit au niveau de la page et
 * non dans le dialogue d'encaissement : les dialogues sont portés (portal), donc l'imbriquer
 * n'apportait rien et le rendait solidaire d'une fenêtre à laquelle il ne sert pas.
 */
export function ManualQtyDialog({ pos }: { pos: PosController }) {
  const product = pos.manualQtyProduct;
  if (!pos.manualQtyOpen || !product) return null;
  const weight = isWeightProduct(product.unit);
  return (
    <Dialog open={pos.manualQtyOpen} onOpenChange={pos.setManualQtyOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Quantité — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Nombre</Label>
          <Input
            type="number"
            step={weight ? "0.001" : "1"}
            value={pos.manualQtyValue}
            onChange={(e) => pos.setManualQtyValue(filterQtyInput(e.target.value, weight))}
            placeholder={weight ? "0,5" : "1"}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                pos.setManualQtyOpen(false);
                pos.onProductClick(product); // +1 par défaut si vide
              }}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                const qty = Math.max(1, parseQty(pos.manualQtyValue, 1));
                pos.setLineQty(product, qty);
                pos.setManualQtyOpen(false);
              }}
            >
              Valider ({pos.manualQtyValue || 1})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
