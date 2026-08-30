import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { updateProduct, type Product } from "@/lib/db";
import { ImageCropper } from "@/components/ImageCropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Fiche ÉCLAIR photo : ouverte par l'appareil photo sur une carte de la caisse.
 * Elle ne montre QUE la photo — nom, prix et stocks vivent dans la modification
 * rapide, pour ne jamais réécrire toute la fiche pour changer une image.
 */
export function ProductPhotoDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Resynchronisé à chaque ouverture : le composant reste monté, seul `product` change.
  useEffect(() => {
    setPhoto(product?.photo);
  }, [product]);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCropSource(URL.createObjectURL(file));
    setCropOpen(true);
  }

  function applyCropped(dataUrl: string) {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource("");
    setPhoto(dataUrl);
  }

  async function save() {
    if (!product) return;
    setBusy(true);
    try {
      // Photo retirée → clé explicitement undefined : IndexedDB ne stocke pas les
      // propriétés undefined, la fiche repart sans image.
      await updateProduct({ ...product, ...(photo ? { photo } : { photo: undefined }) });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">Photo — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {photo ? (
            <img src={photo} alt="" className="h-40 w-40 rounded-xl border object-cover" />
          ) : (
            <span className="flex h-40 w-40 items-center justify-center rounded-xl border bg-muted/40">
              <ImagePlus className="h-10 w-10 text-muted-foreground" />
            </span>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 mr-1.5" />
              {busy ? "…" : photo ? "Changer" : "Ajouter une photo"}
            </Button>
            {photo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setPhoto(undefined)}
              >
                <Trash2 className="h-4 w-4 mr-1.5 text-destructive" />
                Retirer
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-xs text-muted-foreground">
            La zone choisie au recadrage est réduite à 512 px et stockée sur cet appareil.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>

      <ImageCropper
        open={cropOpen}
        onOpenChange={setCropOpen}
        source={cropSource}
        outputSize={512}
        title="Recadrer la photo"
        onCrop={(d) => void applyCropped(d)}
      />
    </Dialog>
  );
}

/**
 * Fiche éclair MODIFICATION : nom, prix, coût et stocks pré-remplis — on change ce
 * qu'on veut et on enregistre, sans rouvrir le formulaire complet de Stocks.
 */
export function ProductQuickEditDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const stockable = product !== null && Number.isFinite(product.stock);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    setName(product?.name ?? "");
    setPrice(product ? String(product.price) : "");
    setCost(product?.cost && product.cost > 0 ? String(product.cost) : "");
    setStock(product && Number.isFinite(product.stock) ? String(product.stock) : "");
    setMinStock(product?.min_stock !== undefined ? String(product.min_stock) : "");
  }, [product]);

  const canSave =
    product !== null && name.trim().length > 0 && /^\d+$/.test(price.replace(/\s/g, ""));

  async function save() {
    if (!product || !canSave) return;
    try {
      await updateProduct({
        ...product,
        name: name.trim(),
        price: Number(price),
        // Coût d'achat : 0 = non renseigné, jamais négatif. Il est figé dans la ligne
        // de vente à l'encaissement (`cost_at_sale`) pour que les marges d'hier restent.
        cost: cost.trim() === "" ? 0 : Math.max(0, Number(cost)),
        ...(stockable ? { stock: Math.max(0, Math.round(Number(stock) || 0)) } : {}),
        ...(minStock.trim() === ""
          ? { min_stock: undefined }
          : { min_stock: Math.max(0, Math.round(Number(minStock))) }),
      });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    }
  }

  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          {/* `truncate` + marge droite : un nom long ne passe plus sous la croix. */}
          <DialogTitle className="truncate pr-8">Modifier — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="qe-name">Nom</Label>
            <Input id="qe-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="qe-price">Prix de vente (F)</Label>
            <Input
              id="qe-price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="qe-cost">Coût d'achat (F)</Label>
            <Input
              id="qe-cost"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Facultatif, mais nécessaire au calcul des bénéfices.
            </p>
          </div>
          {stockable && (
            <>
              <div>
                <Label htmlFor="qe-stock">Stock</Label>
                <Input
                  id="qe-stock"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="qe-min">Seuil d'alerte</Label>
                <Input
                  id="qe-min"
                  inputMode="numeric"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="Par défaut : 5"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!canSave} onClick={() => void save()}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
