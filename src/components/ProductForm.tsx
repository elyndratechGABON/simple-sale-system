// Formulaire de création / édition d'un produit. Partagé entre l'écran Stocks et la
// caisse (catalogue vide → créer le premier produit sans changer d'écran).
//
// Le composant gère lui-même sa mutation et son invalidation : ses deux hôtes n'ont
// qu'à le monter dans un `Dialog` et lui donner un `onClose`.
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { addProduct, updateProduct, type Category, type Product } from "@/lib/db";
import { fileToScaledDataUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "@/components/CategorySelect";
import { useClusterFeatures } from "@/hooks/use-cluster-features";

// Brouillon de variante dans le formulaire : prix/stock gardés en texte pour la saisie,
// convertis en `price?`/`stock?` (productVariant) à l'enregistrement.
// Pour les actifs en location, chaque variante porte aussi une `period`.
type VariantDraft = {
  id: string;
  name: string;
  price: string;
  stock: string;
  period?: "hour" | "day" | "week" | "month" | "year";
};

function draftId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

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
  const { hasSerialNumber, unitType, hasExpiryDate, isLocation, hasVariants, hasWeightInput, hasRentalBooking, allowServiceBooking } =
    useClusterFeatures();
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
  const [unit, setUnit] = useState<"piece" | "meter" | "liter">(editing?.unit ?? "piece");
  // Période tarifaire retenue pour l'ACTIF. Le prix saisi va dans `rental_pricing[periode]`
  // (cf. `Product`), donc un même actif porte un prix différent par heure / jour / semaine.
  const [pricingUnit, setPricingUnit] = useState<"hour" | "day" | "week" | "month" | "year">(
    "day",
  );
  // Les tarifs déjà saisis, pour que changer de période ne perde rien : on edite
  // `rental_pricing`, on ne l'écrase pas à chaque rendu.
  const [rentalPricing, setRentalPricing] = useState<NonNullable<Product["rental_pricing"]>>(
    () => editing?.rental_pricing ?? {},
  );
  const [productType, setProductType] = useState<"product" | "service">(
    isLocation ? "service" : (editing?.type ?? defaultType ?? "product"),
  );
  const [serialNumber, setSerialNumber] = useState(editing?.serialNumber ?? "");
  const [expiryDate, setExpiryDate] = useState(
    editing?.expiryDate ? new Date(editing.expiryDate).toISOString().split("T")[0] : "",
  );
  // Photo libre du produit ou service : dataURL webp réduit, purement local.
  const [photo, setPhoto] = useState<string | undefined>(editing?.photo);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Champs location (cluster 'location') : dans ce cluster tout produit est un actif
  // de location, donc `isAsset` est dérivé et non toggleable.
  const isAsset = isLocation || editing?.is_asset === true;
  const [depositAmount, setDepositAmount] = useState<string>(
    editing?.deposit_amount != null ? String(editing.deposit_amount) : "",
  );
  const [totalUnits, setTotalUnits] = useState<string>(
    editing?.total_units != null ? String(editing.total_units) : "",
  );

  // Variantes (vêtements) : liste éditable, câblée à `productVariant`.
  const [variants, setVariants] = useState<VariantDraft[]>(
    () =>
      editing?.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price !== undefined ? String(v.price) : "",
        stock: v.stock !== undefined ? String(v.stock) : "",
        period: v.period ?? (isLocation ? "day" : undefined),
      })) ?? [],
  );

  function addVariant() {
    setVariants((vs) => [
      ...vs,
      { id: draftId(), name: "", price: "", stock: "", period: isLocation ? "day" : undefined },
    ]);
  }
  function updateVariant(id: string, patch: Partial<VariantDraft>) {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }
  function removeVariant(id: string) {
    setVariants((vs) => vs.filter((v) => v.id !== id));
  }

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
      const variantsOut =
        variants.length > 0
          ? variants.map((v) => ({
              id: v.id,
              name: v.name,
              period: v.period ?? (isLocation ? "day" : undefined),
              ...(v.price ? { price: Number(v.price) } : {}),
              ...(v.stock ? { stock: Number(v.stock) } : {}),
            }))
          : undefined;
      const p = {
        name: name.trim(),
        cost: 0,
        price: isAsset
          ? variantsOut && variantsOut.length > 0
            ? (variantsOut[0].price ?? 0)
            : 0
          : Number(price) || 0,
        stock: isAsset
          ? Number(totalUnits) || 0
          : unlimited
            ? Number.POSITIVE_INFINITY
            : Number(stock) || 0,
        min_stock: !unlimited && !isAsset && minStock ? Number(minStock) : undefined,
        // Pour la location : un prix PAR PÉRIODE. Le prix saisi s'écrit dans la case de la
        // période choisie (`rental_pricing`), les autres périodes sont conservées — c'est
        // ce qui permet de facturer 10 h et 3 jours différemment sur le MÊME actif.
        ...(isLocation
          ? {
              is_asset: true,
              rental_pricing: rentalPricing,
              // `price` reste la référence lue par la caisse ; on y met le tarif de la
              // période par défaut pour qu'un appel sans période précise ne soit pas à 0.
              price: rentalPricing[pricingUnit] ?? rentalPricing.day ?? 0,
              deposit_amount: depositAmount ? Number(depositAmount) : undefined,
              total_units: totalUnits ? Number(totalUnits) : undefined,
            }
          : {}),
        category,
        type: productType,
        serialNumber: serialNumber.trim() || undefined,
        // L'unité n'est posée que là où elle a un sens : kg pour la vente au poids,
        // pièce/mètre/litre pour les clusters `mixed`. Jamais pour `unit` simple.
        unit: unitType === "mixed" || unitType === "weight" ? unit : undefined,
        expiryDate: expiryDate ? new Date(expiryDate).getTime() : undefined,
        photo,
        ...(variantsOut ? { variants: variantsOut } : {}),
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
        <DialogTitle>
          {editing
            ? "Modifier le produit"
            : isLocation
              ? "Nouvel actif de location"
              : "Nouveau produit"}
        </DialogTitle>
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
        {!isLocation && !isAsset && (productType === "service" ? (
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
          ))}
        {/* Un seul enfant : une grille 2 colonnes laissait une moitié vide. */}
        {!isLocation && (
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
        )}
        {hasVariants && productType === "product" && (
          <div>
            <Label>Variantes (taille, couleur, pointure…) — prix et stock par variante</Label>
            <div className="mt-1.5 space-y-2">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-xl border bg-card p-2">
                  <Input
                    className="h-9 flex-1"
                    placeholder="Nom (ex : M)"
                    value={v.name}
                    onChange={(e) => updateVariant(v.id, { name: e.target.value })}
                  />
                  <Input
                    className="h-9 w-20"
                    placeholder="Prix"
                    inputMode="numeric"
                    value={v.price}
                    onChange={(e) =>
                      updateVariant(v.id, { price: e.target.value.replace(/\D/g, "") })
                    }
                  />
                  <Input
                    className="h-9 w-20"
                    placeholder="Stock"
                    inputMode="numeric"
                    value={v.stock}
                    onChange={(e) =>
                      updateVariant(v.id, { stock: e.target.value.replace(/\D/g, "") })
                    }
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
        )}
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
        {/* Champs location : tout produit est un actif de location, formulaire à variantes */}
        {isLocation && (
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

            {/* PRIX PAR PÉRIODE — le champ propre à la location. Un actif porte un
                tarif distinct pour chaque plage : la saisie va dans la case de la
                période, les autres sont conservées. C'est ce qui permet à la caisse de
                facturer 3 heures et 2 jours différemment sur le MÊME produit. */}
            <div>
              <Label>Prix par période (FCFA)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Remplissez seulement les périodes que vous facturez. La première reste le
                tarif par défaut quand la durée n'est pas précisée.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ["hour", "Heure"],
                    ["day", "Jour"],
                    ["week", "Semaine"],
                    ["month", "Mois"],
                    ["year", "Année"],
                  ] as const
                ).map(([key, label]) => {
                  const active = pricingUnit === key;
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-2 ${
                        active ? "border-primary bg-accent/40" : ""
                      }`}
                    >
                      <label
                        htmlFor={`rental-${key}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {label}
                      </label>
                      <Input
                        id={`rental-${key}`}
                        inputMode="numeric"
                        className="mt-1 h-9"
                        value={rentalPricing[key] ?? ""}
                        onFocus={() => setPricingUnit(key)}
                        onChange={(e) =>
                          setRentalPricing((prev) => {
                            const v = e.target.value.replace(/\D/g, "");
                            const next = { ...prev };
                            if (v) next[key] = Number(v);
                            else delete next[key];
                            return next;
                          })
                        }
                        placeholder={active ? "Tarif par défaut" : "—"}
                      />
                    </div>
                  );
                })}
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
