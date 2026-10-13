import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatFCFA } from "@/lib/format";
import { cartKey } from "@/lib/pos/types";
import { cn } from "@/lib/utils";
import type { PosController } from "./usePos";

/** Choix de variante : un produit à plusieurs déclinaisons ouvre ce panneau au lieu d'être ajouté. */
export function VariantPickerDialog({ pos }: { pos: PosController }) {
  const product = pos.variantPicker?.product;
  return (
    <Dialog open={pos.variantPicker !== null} onOpenChange={() => pos.setVariantPicker(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product?.name} — choisir une variante</DialogTitle>
        </DialogHeader>
        {product && (
          <div className="grid gap-2">
            {(product.variants ?? []).map((v) => {
              const cur = pos.cart[cartKey(product, v.id)]?.qty ?? 0;
              const stockOk = !Number.isFinite(v.stock) || cur < (v.stock ?? 0);
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!stockOk}
                  onClick={() => {
                    pos.addEntry(product, v.id, 1);
                    pos.setVariantPicker(null);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-left",
                    "hover:border-primary active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !stockOk && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <span>
                    {v.name}
                    {v.size ? ` · ${v.size}` : ""}
                    {v.color ? ` · ${v.color}` : ""}
                    {v.pointure ? ` · ${v.pointure}` : ""}
                  </span>
                  <span className="ml-2 flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {formatFCFA(v.price ?? product.price ?? 0)}
                    </span>
                    {Number.isFinite(v.stock) && (
                      <span className="text-xs opacity-60">
                        {(v.stock ?? 0) - cur} restant{(v.stock ?? 0) - cur !== 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
