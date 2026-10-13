import { useState, useMemo } from "react";
import { X, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatFCFA } from "@/lib/format";
import { ProductPanel } from "./ProductPanel";
import type { PosController } from "./usePos";
import type { Sale } from "@/lib/db";

interface LocalItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  variant?: string;
  variantId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sale: Sale | null;
  items: LocalItem[];
  pos: PosController;
  onClose: () => void;
}

// --- Ligne d'article (extraite pour ne plus casser le shell) ---
function ItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: LocalItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>
            {item.quantity} × {formatFCFA(item.price)}
          </span>
          <span className="font-medium text-primary">{formatFCFA(item.price * item.quantity)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDecrease}>
          <X className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onIncrease}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Shell ---
export function ProductPickerDialog({ open, onOpenChange, sale, items, pos, onClose }: Props) {
  const [localItems, setLocalItems] = useState<LocalItem[]>(
    () =>
      items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        cost: item.cost,
        variant: item.variant,
        variantId: item.variantId,
      })) ?? [],
  );

  const total = useMemo(
    () => localItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [localItems],
  );

  function handleProductSelect(product: (typeof pos.products)[0]) {
    if (product.variants && product.variants.length > 0) return;
    setLocalItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          cost: product.cost,
        },
      ];
    });
  }

  function decrease(id: string) {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i)),
    );
  }

  function increase(id: string) {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  }

  function remove(id: string) {
    setLocalItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleFinish() {
    if (!sale) return;
    const lines = localItems.map((item) => ({
      product_id: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      cost: item.cost,
      category: "",
      variant: item.variant,
      variant_id: item.variantId,
    }));
    try {
      await pos.addToSaleMut.mutateAsync({ saleId: sale.id, lines });
      onClose();
    } catch {
      // erreur gérée par la mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <DialogTitle>Produits — Table {sale?.table ?? "nouvelle"}</DialogTitle>
            <span className="text-sm font-medium text-primary tabular-nums">
              Total : {localItems.length > 0 ? formatFCFA(total) : "—"}
            </span>
          </div>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            <h3 className="text-sm font-medium text-muted-foreground">Produits</h3>
            <ProductPanel pos={{ ...pos, onProductClick: handleProductSelect }} />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            <h3 className="text-sm font-medium text-muted-foreground">
              Articles ({localItems.length})
            </h3>
            <div className="space-y-2">
              {localItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun article. Sélectionnez des produits à gauche.
                </p>
              ) : (
                localItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onDecrease={() => decrease(item.id)}
                    onIncrease={() => increase(item.id)}
                    onRemove={() => remove(item.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Annuler
          </Button>
          <Button onClick={handleFinish} disabled={localItems.length === 0}>
            <Check className="h-4 w-4 mr-2" /> Sauvegarder et fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
