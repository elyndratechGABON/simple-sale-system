import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    <div>
      <Label htmlFor="photo">Photo</Label>
      <div className="mt-1 flex items-center gap-3">
        {photo ? (
          <img src={photo} alt="" className="h-16 w-16 rounded-lg border object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted/40">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={photoBusy}
            onClick={() => photoInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4 mr-1.5" />
            {photoBusy ? "…" : photo ? "Changer" : "Ajouter une photo"}
          </Button>
          {photo && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(undefined)}>
              <Trash2 className="h-4 w-4 mr-1.5 text-destructive" />
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
      <div className="space-y-3">
        {/* Prix de revente et coût d'achat côte à côte pour les produits (marge d'un coup d'œil).
            Pour un service, seul le prix de revente s'affiche. */}
        {productType === "product" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Prix de revente (FCFA)</Label>
              <Input
                id="price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="Ex : 300"
              />
            </div>
            <div>
              <Label htmlFor="cost">Coût d'achat (FCFA)</Label>
              <Input
                id="cost"
                inputMode="numeric"
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
                placeholder="Optionnel"
              />
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="price">Prix de revente (FCFA)</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex : 300"
            />
          </div>
        )}

        {productType === "product" && (
          <p className="text-xs text-muted-foreground mt-1">
            Optionnel — sans cette valeur, le bénéfice sera surestimé.
          </p>
        )}

        {productType === "product" && (
          <>
            {/* Le stock global n'est PAS saisissable sur un produit à variantes : il est
                la somme des variantes (`normalizeVariantStock`). Proposer une case à
                côté des stocks par variante ferait saisir deux fois le même stock, et
                le premier venu l'écraserait. */}
            {variants.length === 0 && (
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  inputMode="numeric"
                  className="mt-1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="50"
                  disabled={unlimited}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="unlimited"
                checked={unlimited}
                onCheckedChange={(v) => setUnlimited(Boolean(v))}
              />
              <Label htmlFor="unlimited" className="cursor-pointer text-xs">
                Stock illimité
              </Label>
            </div>

            {variants.length === 0 && !unlimited && (
              <div>
                <Label htmlFor="min-stock">Stock minimum (seuil d'alerte)</Label>
                <Input
                  id="min-stock"
                  inputMode="numeric"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="Par défaut : 5"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sous ce seuil, le produit apparaît comme « stock faible ».
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
