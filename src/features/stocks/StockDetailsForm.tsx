import { Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUICK_QTYS } from "./stock-state";

/** Formulaire du produit choisi : quantité, aperçu du nouveau stock, journal. */
export function StockDetailsForm({
  product,
  addQty,
  onQtyChange,
  onBack,
  onSubmit,
  unitCost,
  onUnitCostChange,
  supplier,
  onSupplierChange,
  note,
  onNoteChange,
}: {
  product: Product;
  addQty: string;
  onQtyChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  unitCost: string;
  onUnitCostChange: (v: string) => void;
  supplier: string;
  onSupplierChange: (v: string) => void;
  note: string;
  onNoteChange: (v: string) => void;
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
        <div className="flex items-center gap-2 mt-1.5">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-10 w-10"
            onClick={() => {
              const cur = Number(addQty) || 0;
              if (cur > 0) onQtyChange(String(cur - 1));
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            id="add-qty"
            inputMode="numeric"
            value={addQty}
            onChange={(e) => onQtyChange(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="h-12 text-lg font-bold text-center"
            onKeyDown={(e) => {
              if (e.key === "Enter" && Number(addQty) > 0) onSubmit();
            }}
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-10 w-10"
            onClick={() => {
              const cur = Number(addQty) || 0;
              onQtyChange(String(cur + 1));
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {QUICK_QTYS.map((q) => (
            <Button
              key={q}
              variant={Number(addQty) === q ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => onQtyChange(String(q))}
            >
              +{q}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">Nouveau stock</p>
        <p className="text-xl font-bold tabular-nums">{product.stock + (Number(addQty) || 0)}</p>
      </div>

      {/* Champs optionnels du journal de mouvements */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="unit-cost">Prix d'achat unitaire</Label>
          <Input
            id="unit-cost"
            inputMode="numeric"
            value={unitCost}
            onChange={(e) => onUnitCostChange(e.target.value.replace(/\D/g, ""))}
            placeholder="Optionnel"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="supplier">Fournisseur</Label>
          <Input
            id="supplier"
            value={supplier}
            onChange={(e) => onSupplierChange(e.target.value)}
            placeholder="Optionnel"
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="movement-note">Note</Label>
        <Input
          id="movement-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Optionnelle — ex : livraison du matin"
          className="mt-1.5"
        />
      </div>
    </>
  );
}
