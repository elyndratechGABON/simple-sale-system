import { useRef } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProductFormState } from "./useProductForm";

/** Bloc « Variantes » : coût d'achat, prix de revente et stock par variante (taille, couleur, pointure…). */
export function VariantEditor({ form }: { form: ProductFormState }) {
  const { variants, updateVariant, removeVariant, addVariant, handleVariantPhoto } = form;
  const vPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <span className="text-lg">⟳</span>
        </span>
        <div>
          <Label className="font-semibold text-sm">Variantes</Label>
          <p className="text-xs text-muted-foreground">
            Tailles, couleurs, pointures et stocks associés.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 rounded-xl border bg-card p-2"
          >
            <button
              type="button"
              onClick={() => vPhotoRefs.current[v.id]?.click()}
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30"
              title="Photo de la variante"
              aria-label={`Photo de la variante ${v.name || "sans nom"}`}
            >
              {v.photo ? (
                <img src={v.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <input
              ref={(el) => {
                if (el) vPhotoRefs.current[v.id] = el;
              }}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleVariantPhoto(v.id, e)}
            />
            <div className="min-w-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Input
                className="h-10 col-span-2 sm:col-span-3"
                placeholder="Nom (ex : M)"
                value={v.name}
                onChange={(e) => updateVariant(v.id, { name: e.target.value })}
              />
              <Input
                className="h-10"
                placeholder="Coût"
                inputMode="numeric"
                value={v.cost}
                onChange={(e) => updateVariant(v.id, { cost: e.target.value.replace(/\D/g, "") })}
                title="Coût d'achat"
              />
              <Input
                className="h-10"
                placeholder="Prix"
                inputMode="numeric"
                value={v.price}
                onChange={(e) => updateVariant(v.id, { price: e.target.value.replace(/\D/g, "") })}
                title="Prix de revente"
              />
              <Input
                className="h-10"
                placeholder="Stock"
                inputMode="numeric"
                value={v.stock}
                onChange={(e) => updateVariant(v.id, { stock: e.target.value.replace(/\D/g, "") })}
                title="Stock disponible"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => removeVariant(v.id)}
              aria-label={`Retirer la variante ${v.name || "sans nom"}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVariant}
          className="w-full h-10"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter une variante
        </Button>
      </div>
    </div>
  );
}
