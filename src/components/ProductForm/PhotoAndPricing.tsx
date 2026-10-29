import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProductFormState } from "./useProductForm";

/**
 * Photo, prix et gestion du stock, resserrés : le formulaire doit tenir sur un écran
 * mobile sans scroller. Avant : une carte « Gestion du stock » empilée sous les prix ;
 * après : le toggle illimité sur la ligne du titre, stock et seuil côte à côte.
 */
export function PhotoAndPricing({ form }: { form: ProductFormState }) {
  const {
    photo,
    setPhoto,
    photoInputRef,
    cameraInputRef,
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

  /** Deux inputs cachés : `capture=environment` déclenche l'APN, l'autre la galerie. */
  function pickCamera() {
    cameraInputRef.current?.click();
  }
  function pickGallery() {
    photoInputRef.current?.click();
  }

  return (
    <div className="space-y-2.5">
      {/* Photo : deux gestes explicites. Un seul bouton ouvrait toujours la galerie —
          sur téléphone, la prise de photo directe est le chemin le plus court. */}
      <div>
        <Label className="text-xs font-medium">Photo du produit</Label>
        <div className="mt-1 flex items-center gap-2">
          {photo ? (
            <div className="relative h-10 w-10 shrink-0 rounded-lg border bg-muted/40">
              <img
                src={photo}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
                width={40}
                height={40}
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoBusy}
              onClick={pickCamera}
              className="h-8 text-xs"
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Prendre une photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={photoBusy}
              onClick={pickGallery}
              className="h-8 text-xs"
            >
              <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
              Galerie
            </Button>
            {photo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhoto(undefined)}
                className="h-8 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                Retirer
              </Button>
            )}
          </div>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhoto}
        />
      </div>

      {/* Prix et coût sur la même ligne (produit) : une ligne pleine en moins. */}
      <div className={cn("grid gap-2", productType === "product" ? "grid-cols-2" : "grid-cols-1")}>
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
            className="mt-0.5 h-10 text-sm"
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
              className="mt-0.5 h-10 text-sm"
            />
          </div>
        )}
      </div>
      {productType === "product" && (
        <p className="text-[10px] text-muted-foreground">
          Optionnel — sans cette valeur, le bénéfice sera surestimé.
        </p>
      )}

      {/* Stock (produit sans variante) : toggle à droite du titre, stock et seuil
          côtoyés sur une grille 2 colonnes — l'encart à bord est supprimé. */}
      {productType === "product" && variants.length === 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="unlimited"
                checked={unlimited}
                onCheckedChange={(v) => setUnlimited(Boolean(v))}
              />
              <Label htmlFor="unlimited" className="cursor-pointer text-xs font-medium">
                Stock illimité
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
                className="mt-0.5 h-10 text-sm"
              />
            </div>
            {!unlimited && (
              <div>
                <Label htmlFor="min-stock" className="text-xs">
                  Seuil d'alerte (5)
                </Label>
                <Input
                  id="min-stock"
                  inputMode="numeric"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="5"
                  className="mt-0.5 h-10 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
