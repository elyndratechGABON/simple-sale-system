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
      {/* Photo et suppression séparée sous la miniature (audit UI §4) : plus de bouton
          flottant risquant un clic malencontreux sur la photo. */}
      <div>
        <Label className="text-xs font-medium">Photo du produit</Label>
        <div className="mt-1.5 flex flex-col gap-2.5">
          {photo ? (
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 rounded-lg border bg-muted/40 overflow-hidden">
                <img
                  src={photo}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover"
                  width={56}
                  height={56}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPhoto(undefined)}
                className="h-9 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Supprimer la photo
              </Button>
            </div>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoBusy}
              onClick={pickCamera}
              className="h-9 text-xs"
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
              className="h-9 text-xs"
            >
              <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
              Galerie
            </Button>
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

      {/* Prix et coût sur une colonne (mobile) ou deux (sm+) : évite l'écrasement sur très petits écrans (§4.3). */}
      <div
        className={cn(
          "grid gap-2",
          productType === "product" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        )}
      >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
