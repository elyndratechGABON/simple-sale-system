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
          <div className="grid gap-2 max-h-[65dvh] overflow-y-auto scroll-slim">
            {/* Prix de BASE rappelé en tête (mission variantes) : le vendeur compare
                chaque déclinaison à l'article simple, en un regard. */}
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Prix de base&nbsp;:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatFCFA(product.price ?? 0)}
              </span>
            </p>
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
                    "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left",
                    "hover:border-primary active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !stockOk && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {/* Photo PROPRE à la variante si elle en a une, sinon photo du produit. */}
                  {(v.photo ?? product.photo) ? (
                    <img
                      src={v.photo ?? product.photo}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg border bg-muted/30 object-cover"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">
                      {v.name}
                      {v.size ? ` · ${v.size}` : ""}
                      {v.color ? ` · ${v.color}` : ""}
                      {v.pointure ? ` · ${v.pointure}` : ""}
                    </span>
                    {/* PRIX DE LA VARIANTE EN ÉVIDENCE (mission variantes) : c'est
                        LE prix qui sera encaissé — plus de devinette. */}
                    <span className="text-base font-bold text-primary tabular-nums">
                      {formatFCFA(v.price ?? product.price ?? 0)}
                    </span>
                  </span>
                  <span className="ml-2 flex shrink-0 items-center gap-2">
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
