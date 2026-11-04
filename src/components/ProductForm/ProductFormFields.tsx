import type { FC } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    estProprietaire,
    partage,
    setPartage,
  } = form;

  return (
    <div className="space-y-2.5">
      {/* Partage avec l'équipe — PROPRIÉTAIRE SEULEMENT. ON par défaut ; décoché, le
          produit enregistré porte `is_private: true` et ne quitte jamais cet écran
          (ni snapshot, ni op P2P). Un employé ne voit pas ce réglage : ce qu'il crée
          part toujours vers le patron. */}
      {estProprietaire && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
          <div className="min-w-0">
            <Label htmlFor="partage-equipe" className="text-xs font-medium">
              Partager ce produit avec mon équipe
            </Label>
            <p className="text-[10px] text-muted-foreground">
              {partage
                ? "Il apparaîtra sur les caisses de vos employés."
                : "Il restera uniquement sur cette caisse."}
            </p>
          </div>
          <Switch
            id="partage-equipe"
            checked={partage}
            onCheckedChange={(v) => setPartage(Boolean(v))}
          />
        </div>
      )}

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

      {/*.Unité de vente + Catégorie SUR LA MÊME LIGNE (mission formulaire compact):
          quand le type a une unité, les deux partagent un grid 2 colonnes — chaque
          enregistrement du formulaire. */}
      {productType === "product" ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
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
          <div className="space-y-1">
            <Label className="text-xs font-medium">Catégorie</Label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Catégorie</Label>
          <CategorySelect value={category} onChange={setCategory} />
        </div>
      )}

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
