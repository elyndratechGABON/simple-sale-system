import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProductFormState } from "./useProductForm";

/** Bloc « Photo » — et, par héritage de sa structure d'origine, le prix et les seuils de
 *  stock qu'il contient. Le div imbriqué est volontairement conservé tel quel. */
export function PhotoAndPricing({ form }: { form: ProductFormState }) {
  const {
    photo,
    setPhoto,
    photoInputRef,
    photoBusy,
    handlePhoto,
    price,
    setPrice,
    cost,
    setCost,
    productType,
    variants,
    stock,
    setStock,
    unlimited,
    setUnlimited,
    minStock,
    setMinStock,
  } = form;

  return (
    <div className="space-y-3">
      {/* Photo section */}
      <div>
        <Label htmlFor="photo" className="text-sm">
          Photo du produit
        </Label>
        <div className="mt-1 flex items-center gap-2.5">
          {photo ? (
            <div className="relative h-12 w-12 shrink-0 rounded-lg border bg-muted/40">
              <img
                src={photo}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
                width={48}
                height={48}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={() => setPhoto(undefined)}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="photo"
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoBusy}
              onClick={() => photoInputRef.current?.click()}
              className="h-9 text-xs"
            >
              <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
              {photoBusy ? "…" : photo ? "Changer" : "Ajouter une photo"}
            </Button>
            {photo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhoto(undefined)}
                className="h-9 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                Retirer
              </Button>
            )}
          </div>
        </div>
        <input
          ref={photoInputRef}
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />
      </div>

      {/* Prix et coût d'achat */}
      <div className={cn("space-y-1.5", productType === "product" && "grid grid-cols-2 gap-2")}>
        <div>
          <Label htmlFor="price" className="text-xs font-medium">
            Prix de vente *
          </Label>
          <Input
            id="price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="Ex : 300"
            className="mt-0.5 h-9 text-sm"
          />
        </div>
        {productType === "product" && (
          <div>
            <Label htmlFor="cost" className="text-xs font-medium">
              Coût d'achat
            </Label>
            <Input
              id="cost"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
              placeholder="Optionnel"
              className="mt-0.5 h-9 text-sm"
            />
          </div>
        )}
      </div>

      {productType === "product" && (
        <p className="text-[10px] text-muted-foreground">
          Optionnel — sans cette valeur, le bénéfice sera surestimé.
        </p>
      )}

      {/* Section Gestion du stock pour les produits */}
      {productType === "product" && (
        <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Gestion du stock
            </Label>
            {variants.length > 0 && (
              <span className="text-[10px] text-muted-foreground">Géré par variante</span>
            )}
          </div>

          {variants.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <div>
                <Label htmlFor="stock" className="text-xs">
                  Stock initial
                </Label>
                <Input
                  id="stock"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex : 50"
                  disabled={unlimited}
                  className="mt-0.5 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 sm:pt-4">
                <Checkbox
                  id="unlimited"
                  checked={unlimited}
                  onCheckedChange={(v) => setUnlimited(Boolean(v))}
                />
                <Label htmlFor="unlimited" className="cursor-pointer text-xs font-medium">
                  Stock illimité
                </Label>
              </div>

              {!unlimited && (
                <div className="sm:col-span-2">
                  <Label htmlFor="min-stock" className="text-xs">
                    Seuil d'alerte (par défaut : 5)
                  </Label>
                  <Input
                    id="min-stock"
                    inputMode="numeric"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ""))}
                    placeholder="5"
                    className="mt-0.5 h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
