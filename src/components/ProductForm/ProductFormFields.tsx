import type { FC } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
          className="h-10 text-sm"
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

      {/* Variantes : repliées par défaut (Collapsible) — le formulaire tient dans le
          viewport ; la section s'ouvre d'elle-même si on édite un produit qui EN A déjà. */}
      {showVariants && (
        <Collapsible
          defaultOpen={form.variants.length > 0}
          className="rounded-lg border border-border/50 px-3 py-2"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
            <span className="flex items-center gap-2">
              <span className="text-xs font-medium">Variantes</span>
              {form.variants.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {form.variants.length}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2">
              <VariantEditor form={form} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
