// Formulaire de création / édition d'un produit. Partagé entre l'écran Stocks et la
// caisse (catalogue vide → créer le premier produit sans changer d'écran).
//
// Le composant gère lui-même sa mutation et son invalidation : ses deux hôtes n'ont
// qu'à le monter dans un `Dialog` et lui donner un `onClose`.
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { addProduct, updateProduct, type Category, type Product } from "@/lib/db";
import { fileToScaledDataUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "@/components/CategorySelect";
import { useClusterFeatures } from "@/hooks/use-cluster-features";

export function ProductForm({
  editing,
  onClose,
  defaultCategory,
  defaultType,
}: {
  editing: Product | null;
  onClose: () => void;
  defaultCategory?: Category;
  defaultType?: "product" | "service";
}) {
  const qc = useQueryClient();
  const { hasSerialNumber, unitType, hasExpiryDate, isLocation } = useClusterFeatures();
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState<string>(editing ? String(editing.price) : "");
  const [unlimited, setUnlimited] = useState(editing ? !Number.isFinite(editing.stock) : false);
  const [stock, setStock] = useState<string>(
    editing && Number.isFinite(editing.stock) ? String(editing.stock) : "",
  );
  const [minStock, setMinStock] = useState<string>(
    editing?.min_stock !== undefined ? String(editing.min_stock) : "",
  );
  const [category, setCategory] = useState<Category>(
    editing?.category ?? defaultCategory ?? "Boisson",
  );
  const [productType, setProductType] = useState<"product" | "service">(
    editing?.type ?? defaultType ?? "product",
  );
  const [serialNumber, setSerialNumber] = useState(editing?.serialNumber ?? "");
  const [unit, setUnit] = useState<"piece" | "meter" | "liter">(editing?.unit ?? "piece");
  const [expiryDate, setExpiryDate] = useState(
    editing?.expiryDate ? new Date(editing.expiryDate).toISOString().split("T")[0] : "",
  );
  // Photo libre du produit ou service : dataURL webp réduit, purement local.
  const [photo, setPhoto] = useState<string | undefined>(editing?.photo);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Champs location (cluster 'location')
  const [isAsset, setIsAsset] = useState(editing?.is_asset ?? isLocation);
  const [rentalHour, setRentalHour] = useState<string>(
    editing?.rental_pricing?.hour != null ? String(editing.rental_pricing.hour) : "",
  );
  const [rentalDay, setRentalDay] = useState<string>(
    editing?.rental_pricing?.day != null ? String(editing.rental_pricing.day) : "",
  );
  const [rentalWeek, setRentalWeek] = useState<string>(
    editing?.rental_pricing?.week != null ? String(editing.rental_pricing.week) : "",
  );
  const [rentalMonth, setRentalMonth] = useState<string>(
    editing?.rental_pricing?.month != null ? String(editing.rental_pricing.month) : "",
  );
  const [depositAmount, setDepositAmount] = useState<string>(
    editing?.deposit_amount != null ? String(editing.deposit_amount) : "",
  );
  const [totalUnits, setTotalUnits] = useState<string>(
    editing?.total_units != null ? String(editing.total_units) : "",
  );

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const { dataUrl } = await fileToScaledDataUrl(file);
      setPhoto(dataUrl);
    } catch {
      toast.error("Impossible d'utiliser cette image.");
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const p = {
        name: name.trim(),
        cost: 0,
        price: isAsset ? Number(rentalDay) || 0 : Number(price) || 0,
        stock: isAsset
          ? Number(totalUnits) || 0
          : unlimited
            ? Number.POSITIVE_INFINITY
            : Number(stock) || 0,
        min_stock: !unlimited && !isAsset && minStock ? Number(minStock) : undefined,
        category,
        type: productType,
        serialNumber: serialNumber.trim() || undefined,
        unit: unitType === "mixed" || unitType === "weight" ? unit : undefined,
        expiryDate: expiryDate ? new Date(expiryDate).getTime() : undefined,
        photo,
        // Champs location
        is_asset: isAsset || undefined,
        rental_pricing: isAsset
          ? {
              hour: rentalHour ? Number(rentalHour) : undefined,
              day: rentalDay ? Number(rentalDay) : undefined,
              week: rentalWeek ? Number(rentalWeek) : undefined,
              month: rentalMonth ? Number(rentalMonth) : undefined,
            }
          : undefined,
        deposit_amount: isAsset && depositAmount ? Number(depositAmount) : undefined,
        total_units: isAsset && totalUnits ? Number(totalUnits) : undefined,
      };
      if (!p.name) throw new Error("Nom requis");
      if (!isAsset && p.price <= 0) throw new Error("Prix invalide");
      if (isAsset && !totalUnits) throw new Error("Nombre d'unités requis");
      if (editing) {
        await updateProduct({ ...editing, ...p });
      } else {
        await addProduct(p);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Produit mis à jour" : "Produit ajouté");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Regab"
          />
        </div>
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
        </div>
        {productType === "service" ? (
          <div>
            <Label htmlFor="price">Prix de vente</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="300"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Prix de vente</Label>
                <Input
                  id="price"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="300"
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="50"
                  disabled={unlimited}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="unlimited"
                checked={unlimited}
                onCheckedChange={(v) => setUnlimited(Boolean(v))}
              />
              <Label htmlFor="unlimited" className="cursor-pointer">
                Stock illimité
              </Label>
            </div>
            {!unlimited && (
              <div>
                <Label htmlFor="min-stock">Stock minimum (alerte)</Label>
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
        {/* Un seul enfant : une grille 2 colonnes laissait une moitié vide. */}
        <div>
          <Label>Type</Label>
          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant={productType === "product" ? "default" : "outline"}
              size="sm"
              onClick={() => setProductType("product")}
              className="flex-1"
            >
              Produit
            </Button>
            <Button
              type="button"
              variant={productType === "service" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setProductType("service");
                setUnlimited(true);
              }}
              className="flex-1"
            >
              Prestation
            </Button>
          </div>
        </div>
        {hasSerialNumber && productType === "product" && (
          <div>
            <Label htmlFor="serialNumber">Numéro de série / IMEI</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Optionnel — ex: IMEI ou N° série"
            />
          </div>
        )}
        {/* Champs location : actif de location avec tarification par période */}
        {isLocation && productType === "product" && (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_asset"
                checked={isAsset}
                onCheckedChange={(v) => setIsAsset(Boolean(v))}
              />
              <Label htmlFor="is_asset" className="cursor-pointer">
                Actif de location (chaises, tentes, voitures…)
              </Label>
            </div>
            {isAsset && (
              <>
                <div>
                  <Label htmlFor="total_units">Nombre d'unités physiques</Label>
                  <Input
                    id="total_units"
                    inputMode="numeric"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ex : 50 chaises, 3 voitures"
                  />
                </div>
                <div>
                  <Label>Tarifs de location (FCFA)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <Label htmlFor="rental_hour" className="text-xs text-muted-foreground">
                        Par heure
                      </Label>
                      <Input
                        id="rental_hour"
                        inputMode="numeric"
                        value={rentalHour}
                        onChange={(e) => setRentalHour(e.target.value.replace(/\D/g, ""))}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rental_day" className="text-xs text-muted-foreground">
                        Par jour
                      </Label>
                      <Input
                        id="rental_day"
                        inputMode="numeric"
                        value={rentalDay}
                        onChange={(e) => setRentalDay(e.target.value.replace(/\D/g, ""))}
                        placeholder="Ex : 5000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rental_week" className="text-xs text-muted-foreground">
                        Par semaine
                      </Label>
                      <Input
                        id="rental_week"
                        inputMode="numeric"
                        value={rentalWeek}
                        onChange={(e) => setRentalWeek(e.target.value.replace(/\D/g, ""))}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rental_month" className="text-xs text-muted-foreground">
                        Par mois
                      </Label>
                      <Input
                        id="rental_month"
                        inputMode="numeric"
                        value={rentalMonth}
                        onChange={(e) => setRentalMonth(e.target.value.replace(/\D/g, ""))}
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="deposit">Caution par défaut (FCFA)</Label>
                  <Input
                    id="deposit"
                    inputMode="numeric"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="Optionnel — montant retenu au client"
                  />
                </div>
              </>
            )}
          </>
        )}
        {!isAsset &&
          (unitType === "mixed" || unitType === "weight") &&
          productType === "product" && (
            <div>
              <Label>Unité de vente</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={unit === "piece" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnit("piece")}
                >
                  Pièce
                </Button>
                <Button
                  type="button"
                  variant={unit === "meter" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnit("meter")}
                >
                  Mètre
                </Button>
                <Button
                  type="button"
                  variant={unit === "liter" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnit("liter")}
                >
                  Litre
                </Button>
              </div>
            </div>
          )}
        {hasExpiryDate && productType === "product" && (
          <div>
            <Label htmlFor="expiryDate">Date de péremption</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
        )}
        <div>
          <Label>Catégorie</Label>
          <CategorySelect value={category} onChange={setCategory} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          Enregistrer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
