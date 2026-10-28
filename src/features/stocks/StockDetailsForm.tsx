import type { Product } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Formulaire du produit choisi : quantité et aperçu du nouveau stock. */
export function StockDetailsForm({
  product,
  addQty,
  onQtyChange,
  onBack,
  onSubmit,
}: {
  product: Product;
  addQty: string;
  onQtyChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-between rounded-lg border border-primary bg-accent/50 p-3 text-left ring-1 ring-primary"
      >
        <div className="min-w-0">
          <p className="font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {product.category} · Stock actuel : {product.stock}
          </p>
        </div>
        <Badge variant="secondary" className="ml-2 shrink-0">
          Changer
        </Badge>
      </button>

      <div>
        <Label htmlFor="add-qty">Quantité ajoutée</Label>
        <Input
          id="add-qty"
          inputMode="numeric"
          value={addQty}
          onChange={(e) => onQtyChange(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
          className="h-12 text-lg font-bold text-center w-full"
          onKeyDown={(e) => {
            if (e.key === "Enter" && Number(addQty) > 0) onSubmit();
          }}
        />
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">Nouveau stock</p>
        <p className="text-xl font-bold tabular-nums">{product.stock + (Number(addQty) || 0)}</p>
      </div>
    </>
  );
}
