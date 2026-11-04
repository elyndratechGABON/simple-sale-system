import { useState, type FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CategorySelect } from "@/components/CategorySelect";
import { PhotoAndPricing } from "./PhotoAndPricing";
import { ProductTypeSelector } from "./ProductTypeSelector";
import { VariantEditor } from "./VariantEditor";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { getCachedIdentity } from "@/lib/syncengine/identity";
import { cn } from "@/lib/utils";
import type { ProductFormState } from "./useProductForm";

/**
 * Corps du formulaire produit (sans chrome de modale) — partagé par l'onglet Stocks
 * (via ProductForm, dans un Dialog) et l'onboarding (via TutorialProductForm, dans
 * un StepShell). Les deux écrans montent STRICTEMENT les mêmes champs.
 *
 * Ordre (mission UI) : Type d'article → Partage équipe (conditionnel) → Nom →
 * Photo → Prix/Coût → Stock → Unités → Catégorie → Variantes.
 * Tout est aligné à GAUCHE : les labels au-dessus de leurs inputs, jamais centrés.
 */
export const ProductFormFields: FC<{ form: ProductFormState; isOnboarding?: boolean }> = ({
  form,
  isOnboarding = false,
}) => {
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
  // Le toggle « Partager » n'a de sens que si l'équipe existe déjà : au premier
  // produit (onboarding), AUCUN employé n'est appairé — le réglage n'apparaît pas.
  const identity = getCachedIdentity();
  const { data: peers = [] } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    enabled: estProprietaire && !isOnboarding && Boolean(identity?.shopId),
  });
  const canShowPartage = estProprietaire && !isOnboarding && peers.length > 0;

  // Inline « Ajouter une catégorie » : saisie immédiate d'un nom — la catégorie
  // est appliquée au produit en cours ; elle apparaîtra dans le selecteur des
  // prochaines fois dès qu'un produit la porte.
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const addCategory = () => {
    const value = newCategory.trim();
    if (!value) return;
    setCategory(value);
    setNewCategory("");
    setAddingCategory(false);
  };

  return (
    <div className="space-y-2.5 text-left">
      {/* Le type commande quels champs existent : TOUT EN PREMIER (mission UI). */}
      <div className="space-y-1 text-left">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left">
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

      {/* Partage avec l'équipe — PROPRIÉTAIRE SEUL, avec au moins UN employé
          appairé, et JAMAIS pendant l'onboarding (pas encore d'équipe). ON par
          défaut ; décoché, le produit reste privé (is_private: true). */}
      {canShowPartage && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-left">
          <div className="min-w-0 text-left">
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

      {/* Nom du produit */}
      <div className="space-y-1 text-left">
        <Label htmlFor="name" className="text-xs font-medium text-left">
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

      {/* Photo et Prix (photo → prix/coût → stock dans le même ordre) */}
      <PhotoAndPricing form={form} />

      {/* Unité de vente (grille 2×2 : Pièce/Kg puis Litre/Mètre) + Catégorie et
          son bouton « Ajouter une catégorie ». */}
      {productType === "product" ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
          <div className="space-y-1 text-left">
            <Label className="text-xs font-medium text-left">Unité de vente</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["piece", "Pièce"],
                  ["kg", "Kg"],
                  ["liter", "Litre"],
                  ["meter", "Mètre"],
                ] as const
              ).map(([value, label], i) => (
                <Button
                  key={value}
                  type="button"
                  variant={unit === value ? "default" : "outline"}
                  onClick={() => setUnit(value)}
                  className={cn(
                    "h-10 justify-center rounded-md text-xs",
                    // 2 lignes strictes : Pièce|Kg puis Litre|Mètre.
                    i === 2 && "col-start-1 row-start-2",
                    i === 3 && "col-start-2 row-start-2",
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1 text-left">
            <Label className="text-xs font-medium text-left">Catégorie</Label>
            <CategorySelect value={category} onChange={setCategory} />
            {!addingCategory ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddingCategory(true)}
                className="h-10 w-full justify-center text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une catégorie
              </Button>
            ) : (
              <div className="flex gap-1.5">
                <Input
                  autoFocus
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
                    }
                    if (e.key === "Escape") setAddingCategory(false);
                  }}
                  placeholder="Nom de la catégorie"
                  className="h-10 text-sm"
                  aria-label="Nom de la nouvelle catégorie"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={addCategory}
                  aria-label="Valider la nouvelle catégorie"
                  disabled={!newCategory.trim()}
                  className="h-10 w-10 shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-left">
          <Label className="text-xs font-medium text-left">Catégorie</Label>
          <CategorySelect value={category} onChange={setCategory} />
          {!addingCategory ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddingCategory(true)}
              className="h-10 w-full justify-center text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une catégorie
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                  if (e.key === "Escape") setAddingCategory(false);
                }}
                placeholder="Nom de la catégorie"
                className="h-10 text-sm"
                aria-label="Nom de la nouvelle catégorie"
              />
              <Button
                type="button"
                size="icon"
                onClick={addCategory}
                aria-label="Valider la nouvelle catégorie"
                disabled={!newCategory.trim()}
                className="h-10 w-10 shrink-0"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          )}
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
