import { useMemo } from "react";
import type { Product, SaleItem } from "@/lib/db";
import { soldProductsByCategory } from "@/lib/reports/sold-products-by-category";
import { ProductCostRow } from "./ProductCostRow";

/**
 * Passage EN LOT des coûts d'achat, pour les produits vendus sur la période.
 *
 * Ce n'est PAS la porte principale de la saisie : le formulaire produit la porte
 * individuelle (je crée un article, je connais son coût d'achat). Ici, c'est le cas de
 * masse — un catalogue de 200 articles dont aucun coût n'est renseigné ne se remplit pas
 * avec 200 allers-retours vers l'écran Stocks.
 *
 * UNE SEULE liste (plus de découpage « Avec coût / Sans coût ») : un produit VENDU a
 * toujours un coût — à zéro si rien n'est saisi, un SERVICE n'en a pas. Regroupement par
 * catégorie, dans l'ordre du chiffre d'affaires. Les produits SUPPRIMÉS de la période
 * figurent en lecture seule : leur coût est figé à la vente.
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

  // Même prédicat que `useCostAlerts` : un coût absent ou nul est un coût manquant —
  // SAUF pour un produit supprimé, dont le coût (figé à la vente) n'est plus modifiable.
  const [vendus, supprimes] = useMemo(() => {
    const vivants: typeof groups = [];
    const disparus: typeof groups = [];
    for (const group of groups) {
      const vivantList = group.list.filter((e) => !e.orphan);
      const disparuList = group.list.filter((e) => e.orphan);
      if (vivantList.length > 0) vivants.push({ ...group, list: vivantList });
      if (disparuList.length > 0) disparus.push({ ...group, list: disparuList });
    }
    return [vivants, disparus];
  }, [groups]);

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aucun produit vendu sur la période
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {[
        { titre: "Produits vendus", liste: vendus, note: undefined },
        {
          titre: "Produits supprimés",
          liste: supprimes,
          note: "Coût figé au moment de la vente — lecture seule.",
        },
      ].map(({ titre, liste, note }) =>
        liste.length === 0 ? null : (
          <section key={titre}>
            <h3 className="mb-1 text-sm font-semibold">
              {titre} ({liste.reduce((n, g) => n + g.list.length, 0)})
            </h3>
            {note && <p className="mb-1 text-xs text-muted-foreground">{note}</p>}
            {liste.map((group) => (
              <div key={group.category} className="mb-2 last:mb-0">
                <p className="mb-1 text-xs text-muted-foreground">{group.category}</p>
                <div className="rounded-lg border px-3">
                  {group.list.map((entry) => (
                    <ProductCostRow
                      key={entry.product.id}
                      product={entry.product}
                      quantitySold={entry.quantity}
                      revenue={entry.revenue}
                      readOnly={entry.orphan}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ),
      )}
    </div>
  );
}
