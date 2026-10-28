import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "@/components/CategorySelect";
import { PhotoAndPricing } from "./PhotoAndPricing";
import { ProductTypeSelector } from "./ProductTypeSelector";
import { VariantEditor } from "./VariantEditor";
import { cn } from "@/lib/utils";
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
    <div className="space-y-2.5">
      {/* Le type commande quels champs existent : le choisir EN PREMIER */}
      <div className="space-y-1">
        <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Type d'article
        </Label>
        <ProductTypeSelector
          value={productType}
          onChange={(type) => {
            setProductType(type);
            if (type === "service") setUnlimited(true);
          }}
        />
      </div>

      {/* Nom du produit */}
      <div className="space-y-1">
        <Label htmlFor="name" className="text-xs font-medium">
          Nom du produit *
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Regab 65 cl"
          className="h-9 text-sm"
        />
      </div>

      {/* Photo et Prix */}
      <PhotoAndPricing form={form} />

      {/* Unité de vente pour les produits */}
      {productType === "product" && (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Unité de vente</Label>
          <div className="flex flex-wrap gap-1.5">
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
                className="h-8 px-2.5 rounded-md text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Catégorie */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Catégorie</Label>
        <CategorySelect value={category} onChange={setCategory} />
      </div>

      {/* Variantes */}
      {showVariants && <VariantEditor form={form} />}
    </div>
  );
};
