import { Package, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StepShell } from "./StepShell";
import type { ClusterTutorialApi } from "./useClusterTutorial";
import { ProductTypeSelector } from "@/components/ProductForm/ProductTypeSelector";

export function TutorialProductForm({ t }: { t: ClusterTutorialApi }) {
  // productType unifié : "product" | "service" (remplace serviceMode "prestation"|"produit")
  const isProduct = t.productType === "product";

  // Prix label dynamique selon le type — logique cluster-specific AUTOUR du sélecteur
  const priceLabel = isProduct
    ? t.sellsByWeight
      ? "Prix au kg (FCFA)"
      : "Prix de vente (FCFA)"
    : "Prix de la prestation";

  const showStockField = isProduct;
  const showCategoryField = t.tutorialConfig.showCategory || isProduct;

  const productLabel = isProduct ? "Nom du produit" : t.tutorialConfig.productLabel;
  const productPlaceholder = isProduct
    ? "Ex : Huile de coco, Shampooing"
    : t.tutorialConfig.productPlaceholder;

  const addDescription = isProduct
    ? "Shampooings, huiles, cosmétiques… vendus en boutique, avec stock."
    : t.tutorialConfig.addDescription;

  const categoryPlaceholder = isProduct
    ? "Ex : Produits de beauté, Accessoires"
    : t.tutorialConfig.categoryPlaceholder;

  return (
    <StepShell icon={Package} title={t.addTitle} description={addDescription}>
      <div className="space-y-3">
        {/* Sélecteur unifié Produit / Service — même design que Stocks et édition */}
        <ProductTypeSelector value={t.productType} onChange={t.setProductType} />

        <div>
          <Label htmlFor="tut-name">{productLabel}</Label>
          <Input
            id="tut-name"
            value={t.productName}
            onChange={(e) => t.setProductName(e.target.value)}
            placeholder={productPlaceholder}
            className="h-11"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tut-price">{priceLabel}</Label>
            <Input
              id="tut-price"
              inputMode="numeric"
              value={t.productPrice}
              onChange={(e) => t.setProductPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="h-11"
            />
          </div>
          {showStockField && (
            <div>
              <Label htmlFor="tut-stock">{t.sellsByWeight ? "Stock (kg)" : "Stock"}</Label>
              <Input
                id="tut-stock"
                inputMode="numeric"
                value={t.productStock}
                onChange={(e) => t.setProductStock(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="h-11"
              />
            </div>
          )}
        </div>
        {showCategoryField && (
          <div>
            <Label htmlFor="tut-cat">Catégorie</Label>
            <Input
              id="tut-cat"
              value={t.productCategory}
              onChange={(e) => t.setProductCategory(e.target.value)}
              placeholder={categoryPlaceholder}
              className="h-11"
            />
          </div>
        )}
        {/* Variantes — clothing seulement (vêtements, pointures, tailles). */}
        {t.showVariants && (
          <div className="space-y-2">
            <Label>Variantes (optionnel)</Label>
            <div className="space-y-2">
              {t.variants.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Nom variante (ex: Petit, Grand, Noir, M)"
                    value={v.name}
                    onChange={(e) => {
                      const next = [...t.variants];
                      next[i].name = e.target.value;
                      t.setVariants(next);
                    }}
                    className="h-11 flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Prix"
                    value={v.price}
                    onChange={(e) => {
                      const next = [...t.variants];
                      next[i].price = e.target.value;
                      t.setVariants(next);
                    }}
                    className="h-11 w-24"
                    inputMode="numeric"
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) => {
                      const next = [...t.variants];
                      next[i].stock = e.target.value;
                      t.setVariants(next);
                    }}
                    className="h-11 w-24"
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => t.setVariants(t.variants.filter((_, j) => j !== i))}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => t.setVariants([...t.variants, { name: "", price: "", stock: "" }])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter une variante
              </Button>
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
}
