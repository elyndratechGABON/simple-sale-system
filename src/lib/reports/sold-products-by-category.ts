// Produits vendus sur une période, groupés par catégorie du catalogue.
//
// FONCTION PURE, ici et pas dans le composant : c'est elle qui décide quels produits le
// commerçant voit dans la liste de saisie des coûts. Une omission silencieuse = un coût
// jamais renseigné, donc cette règle a besoin d'être testable sans React ni base.

import type { Product, SaleItem } from "@/lib/db";

/** Ce qu'une période a rapporté pour un produit : la quantité vendue et le CA. */
export interface SoldProduct {
  product: Product;
  quantity: number;
  revenue: number;
}

/**
 * Produits VENDUS sur la période, groupés par catégorie du CATALOGUE.
 *
 * La catégorie vient de `product.category` et non de `category_at_sale` (figée au moment
 * de la vente) : on ne saisit pas un coût depuis l'historique, on parcourt le catalogue.
 * Un produit qui a changé de catégorie depuis ses ventes apparaît donc dans SA catégorie
 * actuelle — c'est le bon choix ici, et l'inverse de `groupByCategory` (onglet Données),
 * où l'on raconte ce qui a été vendu.
 *
 * Deux exclusions, délibérées :
 *  - une ligne LIBRE (pas de `product_id`) n'a pas de fiche : pas de coût à saisir ;
 *  - un produit SUPPRIMÉ reste ignoré — impossible d'y écrire un coût.
 * Dans les deux cas, l'alerte « produits sans coût » de la page couvre le risque.
 *
 * Tri : catégories par CA décroissant (reste à faire à l'appelant), lignes d'une
 * catégorie par quantité décroissante.
 *
 * AUCUN profit ici : ce regroupement sert à saisir des coûts, il ne calcule rien.
 */
export function soldProductsByCategory(
  products: Product[],
  items: SaleItem[],
): Map<string, SoldProduct[]> {
  const sold = new Map<string, { quantity: number; revenue: number }>();
  for (const item of items) {
    if (!item.product_id) continue;
    const total = item.price_at_sale * item.quantity;
    const acc = sold.get(item.product_id);
    if (acc) {
      acc.quantity += item.quantity;
      acc.revenue += total;
    } else {
      sold.set(item.product_id, { quantity: item.quantity, revenue: total });
    }
  }

  const byCategory = new Map<string, SoldProduct[]>();
  for (const product of products) {
    const acc = sold.get(product.id);
    if (!acc) continue; // vendu ailleurs, ou jamais vendu : rien à saisir
    const list = byCategory.get(product.category);
    if (list) list.push({ product, ...acc });
    else byCategory.set(product.category, [{ product, ...acc }]);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => b.quantity - a.quantity);
  }
  return byCategory;
}
