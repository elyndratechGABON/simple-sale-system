import { useMemo } from "react";
import type { Product, SaleItem } from "@/lib/db";
import { soldProductsByCategory } from "@/lib/reports/sold-products-by-category";
import { ProductCostRow } from "./ProductCostRow";

/**
 * Passage EN LOT des coûts d'achat, pour les produits vendus sur la période.
 *
 * Ce n'est PAS la porte principale de la saisie : le formulaire produit la porte
 * individuelle (je crée un article, je connais son prix d'achat). Ici, c'est le cas de
 * masse — un catalogue de 200 articles dont aucun coût n'est renseigné ne se remplit pas
 * avec 200 allers-retours vers l'écran Stocks. L'alerte « produits sans coût » ouvre cette
 * liste avec les articles concernés déjà cochés.
 *
 * Deux groupes : ce qui manque, puis ce qui est déjà là. Les deux sont ÉDITABLES — le
 * batch sert aussi à corriger un coût faux, pas seulement à remplir un trou. Un article
 * renseigné à 5 000 F par erreur se corrige ici, sans repartir vers `/stocks` ligne par
 * ligne.
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

  // Même prédicat que `useCostAlerts` : un coût absent ou nul est un coût manquant.
  // On découpe par groups, l'ordre par chiffre d'affaires est conservé à l'intérieur.
  const [sansCout, avecCout] = useMemo(() => {
    const sans: typeof groups = [];
    const avec: typeof groups = [];
    for (const group of groups) {
      const manquants = group.list.filter((e) => !(e.product.cost > 0));
      const renseignes = group.list.filter((e) => e.product.cost > 0);
      if (manquants.length > 0) sans.push({ ...group, list: manquants });
      if (renseignes.length > 0) avec.push({ ...group, list: renseignes });
    }
    return [sans, avec];
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
        { titre: "Sans coût", liste: sansCout },
        { titre: "Avec coût", liste: avecCout },
      ].map(({ titre, liste }) =>
        liste.length === 0 ? null : (
          <section key={titre}>
            <h3 className="mb-1 text-sm font-semibold">
              {titre} ({liste.reduce((n, g) => n + g.list.length, 0)})
            </h3>
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
