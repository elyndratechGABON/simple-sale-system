import { useMemo } from "react";
import type { Product, SaleItem } from "@/lib/db";
import { soldProductsByCategory } from "@/lib/reports/sold-products-by-category";
import { ProductCostRow } from "./ProductCostRow";

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
