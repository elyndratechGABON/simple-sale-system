import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  /** Deux inputs cachés : `capture=environment` déclenche l'APN, l'autre la galerie.
   *  L'UNIQUE bouton compact choisit l'input NEUTRE (le terminal propose Appareil
   *  photo / Galerie) — un seul geste pour les deux sources (mission Étape 2). */
  function pickGallery() {
    photoInputRef.current?.click();
  }

  return (
    <div className="space-y-2.5">
      {/* Photo : UNE action, un bouton carré compact (mission Étape 2). L'input sans
          `capture` laisse l'appareil proposer Appareil photo / Galerie — un seul
          geste pour les deux sources. La vignette (ou la place réservée) vit à sa
          gauche ; la suppression reste un geste séparé (audit UI §4). */}
      <div>
        <Label className="text-xs font-medium">Photo du produit</Label>
        <div className="mt-1.5 flex items-center gap-2">
          {photo ? (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted/40">
              <img
                src={photoUrlString}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
                width={40}
                height={40}
                decoding="async"
                loading="lazy"
              />
            </div>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={photoBusy}
            onClick={pickGallery}
            aria-label="Choisir une photo"
            title="Prendre une photo ou choisir dans la galerie"
            className="h-10 w-10 shrink-0 justify-center rounded-lg p-0"
          >
            <Camera className="h-4 w-4" />
          </Button>
          {photo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPhoto(undefined)}
              aria-label="Supprimer la photo"
              className="h-9 w-9 shrink-0 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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
          ligne, sans texte d'aide. Le service n'a pas de coût. */}
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

      {/* Stock (produit sans variante), 2 lignes claires (mission Étape 2) :
          ligne 1 = Stock initial + toggle Illimité ; ligne 2 = Seuil d'alerte.
          Sans le stock illimité, le seuil garde un input dédié — plus lisible
          que les deux côte à côte sur un téléphone. */}
      {productType === "product" && variants.length === 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="stock" className="text-xs font-medium">
              Stock initial
            </Label>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="unlimited" className="text-xs text-muted-foreground">
                Illimité
              </Label>
              <Switch
                id="unlimited"
                checked={unlimited}
                onCheckedChange={(v) => setUnlimited(Boolean(v))}
              />
            </div>
          </div>
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
            <div>
              <Label htmlFor="min-stock" className="text-xs font-medium">
                Seuil d'alerte
              </Label>
              <Input
                id="min-stock"
                inputMode="numeric"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ""))}
                placeholder="Ex : 5"
                className="mt-0.5 h-10 text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
