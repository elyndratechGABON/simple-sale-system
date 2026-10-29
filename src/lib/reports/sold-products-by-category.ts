// Produits vendus sur une période, groupés par catégorie.
//
// FONCTION PURE, ici et pas dans le composant : c'est elle qui décide quels produits le
// commerçant voit dans la liste de saisie des coûts. Une omission silencieuse = un coût
// jamais renseigné, donc cette règle a besoin d'être testable sans React ni base.

import { lineCategory } from "@/lib/analytics";
import type { Product, SaleItem } from "@/lib/db";

/** Ce qu'une période a rapporté pour un produit : la quantité vendue et le CA. */
export interface SoldProduct {
  /**
   * Fiche du catalogue — ou fiche RECONSTITUÉE depuis la ligne de vente quand le produit
   * a été supprimé depuis (nom, prix, coût et catégorie figés à la vente).
   */
  product: Product;
  quantity: number;
  revenue: number;
  /**
   * `true` = produit absent du catalogue. Son coût est celui de la vente
   * (`cost_at_sale`), en LECTURE SEULE : il n'y a plus de fiche à mettre à jour.
   */
  orphan: boolean;
}

/**
 * Produits VENDUS sur la période, groupés par catégorie.
 *
 * Le parcours part des LIGNES DE VENTE, pas du catalogue : un produit supprimé après sa
 * vente reste dans le bénéfice. Le faire disparaître faussait le CA de la période —
 * c'était le cas de « riz tchiep », vendu puis supprimé du catalogue.
 *
 * Catégorie : celle du CATALOGUE quand le produit existe encore (on ne saisit pas un
 * coût depuis l'historique, on parcourt le catalogue) ; sinon `category_at_sale`, figée
 * dans la vente. Un produit qui a changé de catégorie depuis ses ventes apparaît donc
 * dans SA catégorie actuelle — l'inverse de `groupByCategory` (onglet Données), où l'on
 * raconte ce qui a été vendu.
 *
 * Une seule exclusion, délibérée : une ligne LIBRE (pas de `product_id`) n'a pas de
 * fiche, donc pas de coût à saisir. Elle reste comptée par `groupByCategory`.
 *
 * Tri : lignes d'une catégorie par quantité décroissante (les catégories sont triées par
 * CA décroissant à l'appelant).
 *
 * AUCUN profit ici : ce regroupement sert à saisir des coûts, il ne calcule rien.
 */
export function soldProductsByCategory(
  products: Product[],
  items: SaleItem[],
): Map<string, SoldProduct[]> {
  const catalogue = new Map(products.map((p) => [p.id, p]));

  // 1. Cumul par `product_id`. AUCUN filtre sur l'existence au catalogue : une ligne
  //    dont le produit a été supprimé compte comme les autres.
  const sold = new Map<string, { quantity: number; revenue: number; sample: SaleItem }>();
  for (const item of items) {
    if (!item.product_id) continue; // ligne libre : pas de fiche, pas de coût à saisir
    const total = item.price_at_sale * item.quantity;
    const acc = sold.get(item.product_id);
    if (acc) {
      acc.quantity += item.quantity;
      acc.revenue += total;
      acc.sample = item;
    } else {
      sold.set(item.product_id, { quantity: item.quantity, revenue: total, sample: item });
    }
  }

  // 2. Une entrée par produit VENDU — pas une par produit du catalogue. C'est ce
  //    parcours qui fait réapparaître les produits supprimés.
  const byCategory = new Map<string, SoldProduct[]>();
  for (const [id, { quantity, revenue, sample }] of sold) {
    const current = catalogue.get(id);
    const entry: SoldProduct = current
      ? { product: current, quantity, revenue, orphan: false }
      : { product: orphanProduct(id, sample), quantity, revenue, orphan: true };
    const list = byCategory.get(entry.product.category);
    if (list) list.push(entry);
    else byCategory.set(entry.product.category, [entry]);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => b.quantity - a.quantity);
  }
  return byCategory;
}

/**
 * Fiche de remplacement pour un produit supprimé, reconstituée depuis sa ligne de vente.
 * Le type n'était pas figé dans la vente : la catégorie « Service » est le seul indice
 * disponible — le même critère que `useCostAlerts`.
 */
function orphanProduct(id: string, item: SaleItem): Product {
  const category = lineCategory(item);
  return {
    id,
    name: item.name,
    cost: item.cost_at_sale ?? 0,
    price: item.price_at_sale,
    stock: 0,
    category,
    type: category === "Service" ? "service" : "product",
    updated_at: item.updated_at,
    sync_status: item.sync_status,
  };
}
