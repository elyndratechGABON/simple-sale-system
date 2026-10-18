import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "@/components/CategorySelect";
import { PhotoAndPricing } from "./PhotoAndPricing";
import { ProductTypeSelector } from "./ProductTypeSelector";
import { VariantEditor } from "./VariantEditor";
import type { ProductFormState } from "./useProductForm";

/** Corps du formulaire produit (sans chrome de modale) — partagé par l'onglet Stocks
 *  (via ProductForm, dans un Dialog) et l'onboarding (via TutorialProductForm, dans
 *  un StepShell). Les deux écrans montent donc STRICTEMENT les mêmes champs. */
export const ProductFormFields: FC<{ form: ProductFormState }> = ({ form }) => {
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
  } = form;

  return (
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
          {/* Les quatre unités sont proposées partout : le kilo n'appartient plus à un
             cluster précis. Un epicier vend du riz au kg sans avoir choisi `weight`.
             Le sélecteur est donc rétrogradé en 4 choix neutres. */}
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
  );
};
