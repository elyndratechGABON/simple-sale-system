import { useMemo } from "react";
import type { Product, SaleItem } from "@/lib/db";
import { soldProductsByCategory } from "@/lib/reports/sold-products-by-category";
import { ProductCostRow } from "./ProductCostRow";

/**
 * Passage EN LOT pour les produits vendus dont le coût d'achat manque.
 *
 * Ce n'est PAS la porte principale de la saisie : le formulaire produit la porte
 * individuelle (je crée un article, je connais son prix d'achat). Ici, c'est le cas de
 * masse — un catalogue de 200 articles dont aucun coût n'est renseigné ne se remplit pas
 * avec 200 allers-retours vers l'écran Stocks. L'alerte « produits sans coût » ouvre cette
 * liste avec les articles concernés déjà cochés.
 *
 * Le regroupement vient de `soldProductsByCategory` : uniquement ce qui a été VENDU sur la
 * période (cf. ce fichier pour les exclusions : ligne libre, produit absent du catalogue).
 */
export function ProductCostsSection({
  products,
  items,
}: {
  products: Product[];
  items: SaleItem[];
}) {
  const groups = useMemo(() => {
    const byCategory = soldProductsByCategory(products, items);
    // Ce qui pèse d'abord, comme dans l'onglet Données.
    return [...byCategory.entries()]
      .map(([category, list]) => ({
        category,
        list,
        revenue: list.reduce((s, p) => s + p.revenue, 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [products, items]);

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aucun produit vendu sur la période
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.category}>
          <h3 className="mb-1 text-sm font-semibold">{group.category}</h3>
          <div className="rounded-lg border px-3">
            {group.list.map((entry) => (
              <ProductCostRow
                key={entry.product.id}
                product={entry.product}
                quantitySold={entry.quantity}
                revenue={entry.revenue}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
