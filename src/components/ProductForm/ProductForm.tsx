// Formulaire de création / édition d'un produit. Partagé entre l'écran Stocks et la
// caisse (catalogue vide → créer le premier produit sans changer d'écran).
//
// Le composant gère lui-même sa mutation et son invalidation : ses deux hôtes n'ont
// qu'à le monter dans un `Dialog` et lui donner un `onClose`.
import type { Category, Product } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "@/components/CategorySelect";
import { PhotoAndPricing } from "./PhotoAndPricing";
import { ProductTypeSelector } from "./ProductTypeSelector";
import { VariantEditor } from "./VariantEditor";
import { useProductForm } from "./useProductForm";

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
  const form = useProductForm({ editing, onClose, defaultCategory, defaultType });
  const {
    name,
    setName,
    productType,
    setProductType,
    setUnlimited,
    serialNumber,
    setSerialNumber,
    unit,
    setUnit,
    category,
    setCategory,
    showVariants,
    hasSerialNumber,
    saveMut,
  } = form;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* Le type commande quels champs existent : le choisir EN PREMIER */}
        <ProductTypeSelector
          value={productType}
          onChange={(type) => {
            setProductType(type);
            if (type === "service") setUnlimited(true);
          }}
        />

        <div>
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Regab"
          />
        </div>

        <PhotoAndPricing form={form} />

        {showVariants && <VariantEditor form={form} />}

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
        {productType === "product" && (
          <div>
            <Label>Unité de vente</Label>
            {/* Les quatre unités sont proposees partout : le kilo n'appartient plus à
                  un cluster précis. Un epicier vend du riz au kg sans avoir choisi
                  `weight`. Le selecteur est donc redegrade en 4 choix neutres. */}
            <div className="flex flex-wrap gap-2 mt-1">
              {(
                [
                  ["piece", "Pièce"],
                  ["kg", "Kg"],
                  ["liter", "Litre"],
                  ["meter", "Mètre"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={unit === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnit(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
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
