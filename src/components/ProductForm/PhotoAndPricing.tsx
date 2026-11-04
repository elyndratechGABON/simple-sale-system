import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProductFormState } from "./useProductForm";

/**
 * Renvoie l'URL de la photo à afficher. La photo est un dataURL string —
 * cible directe `<img src decoding="async" loading="lazy">`, aucun object URL nécessaire.
 */
function photoUrl(photo: string | undefined): string {
  return photo || "";
}

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

  const photoUrlString = photoUrl(photo);

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
                  src={photoUrlString}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover"
                  width={56}
                  height={56}
                  decoding="async"
                  loading="lazy"
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
            {/* Deux gestes, DEUX boutons IDENTIQUES (mission Étape 2) : même variante,
                même taille, même largeur flexible — avant, « Galerie » en ghost
                paraissait plus petit que « Prendre une photo ». */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoBusy}
              onClick={pickCamera}
              className="h-9 min-w-0 flex-1 text-xs justify-center"
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Prendre une photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoBusy}
              onClick={pickGallery}
              className="h-9 min-w-0 flex-1 text-xs justify-center"
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

      {/* Prix et coût CÔTE À CÔTE (mission Étape 2) : deux champs compacts sur UNE
          ligne — le formulaire tient mieux dans le viewport. Le service n'a pas de
          coût : son prix reste sur sa ligne. */}
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
        <p className="text-[10px] text-muted-foreground break-words">
          Optionnel — sans cette valeur, le bénéfice sera surestimé.
        </p>
      )}

      {/* Stock (produit sans variante) : le toggle "Stock illimité" vit DROITE du
          titre "Stock initial" (mission formulaire compact) — un titre à gauche,
          le toggle à droite, une seule ligne de moins dans le formulaire. */}
      {productType === "product" && variants.length === 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-medium">Stock initial</Label>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="unlimited" className="cursor-pointer text-xs font-medium">
                Illimité
              </Label>
              <Checkbox
                id="unlimited"
                checked={unlimited}
                onCheckedChange={(v) => setUnlimited(Boolean(v))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              id="stock"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex : 50"
              disabled={unlimited}
              className="h-10 text-sm"
            />
            {!unlimited && (
              <Input
                id="min-stock"
                inputMode="numeric"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ""))}
                placeholder="Seuil (5)"
                className="h-10 text-sm"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
