import { useMemo } from "react";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { ProductPanel } from "./ProductPanel";
import { useItemsToAdd, type PickerItem } from "./picker/useItemsToAdd";
import { PickerItemRow } from "./picker/PickerItemRow";
import type { PosController } from "./usePos";
import type { Sale } from "@/lib/db";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sale: Sale | null;
  tableLabel: string;
  initialItems?: PickerItem[];
  pos: PosController;
  onClose: () => void;
}

export function ProductPickerDialog({
  open,
  onOpenChange,
  sale,
  tableLabel,
  initialItems,
  pos,
  onClose,
}: Props) {
  const { items, addProduct, increase, decrease, remove } = useItemsToAdd(initialItems ?? []);

  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);

  async function handleFinish() {
    if (items.length === 0) return;
    // La catégorie est reprise de la fiche produit : `addRound` la fige sur la ligne
    // (category_at_sale), une ligne vide ferait disappear la vente des rapports par catégorie.
    const lines = items.map((i) => ({
      product_id: i.productId,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      cost: i.cost,
      category: pos.products.find((p) => p.id === i.productId)?.category ?? "",
    }));
    const saleId = sale ? sale.id : (await pos.openMut.mutateAsync(tableLabel)).id;
    await pos.addToSaleMut.mutateAsync({ saleId, lines });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Table {tableLabel}</DialogTitle>
        </DialogHeader>

        {/* `--page-gutter` neutralisé : les rangées de chips du panneau tirent des
            marges négatives pensées pour la page, et dans la largeur fixe
            de la modale elles généraient la scrollbar horizontale. */}
        <div
          className="grid w-full min-w-0 gap-4 overflow-hidden lg:grid-cols-[1fr_320px] [&_*]:max-w-full"
          style={{ ["--page-gutter" as string]: "0px" }}
        >
          <div className="min-w-0 w-full overflow-hidden">
            <div className="pt-1" />
            <ProductPanel pos={pos} onProductSelect={addProduct} />
          </div>

          <div className="min-w-0 space-y-2 overflow-y-auto max-h-[60vh]">
            {/* Titre « Articles » détaché du titre de la modale */}
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Articles{items.length > 0 ? ` — ${formatFCFA(total)}` : ""}
            </p>
            {items.map((item) => (
              <PickerItemRow
                key={item.id}
                item={item}
                onIncrease={() => increase(item.id)}
                onDecrease={() => decrease(item.id)}
                onRemove={() => remove(item.id)}
              />
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun article pour l'instant.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Annuler
          </Button>
          <Button onClick={handleFinish} disabled={items.length === 0}>
            <Check className="h-4 w-4 mr-2" /> Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
