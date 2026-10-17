import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductFormState } from "./useProductForm";

/** Bloc « Variantes » : coût d'achat, prix de revente et stock par variante (taille, couleur, pointure…). */
export function VariantEditor({ form }: { form: ProductFormState }) {
  const { variants, updateVariant, removeVariant, addVariant } = form;

  return (
    <div>
      <Label>Variantes (taille, couleur, pointure…) — coût, prix et stock par variante</Label>
      <div className="mt-1.5 space-y-2">
        {variants.map((v) => (
          <div key={v.id} className="flex items-center gap-2 rounded-xl border bg-card p-2">
            <Input
              className="h-9 flex-1 min-w-[90px]"
              placeholder="Nom (ex : M)"
              value={v.name}
              onChange={(e) => updateVariant(v.id, { name: e.target.value })}
            />
            <Input
              className="h-9 w-20"
              placeholder="Coût"
              inputMode="numeric"
              value={v.cost}
              onChange={(e) => updateVariant(v.id, { cost: e.target.value.replace(/\D/g, "") })}
              title="Coût d'achat"
            />
            <Input
              className="h-9 w-20"
              placeholder="Prix"
              inputMode="numeric"
              value={v.price}
              onChange={(e) => updateVariant(v.id, { price: e.target.value.replace(/\D/g, "") })}
              title="Prix de revente"
            />
            <Input
              className="h-9 w-16"
              placeholder="Stock"
              inputMode="numeric"
              value={v.stock}
              onChange={(e) => updateVariant(v.id, { stock: e.target.value.replace(/\D/g, "") })}
              title="Stock disponible"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => removeVariant(v.id)}
              aria-label={`Retirer la variante ${v.name || "sans nom"}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter une variante
        </Button>
      </div>
    </div>
  );
}
