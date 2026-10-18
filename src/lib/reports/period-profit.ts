// Bénéfice de l'onglet BÉNÉFICE, recomposé à partir des coûts ACTUELS du catalogue.
//
// FONCTION PURE — et une décision assumée de « deux profits, un par écran » : les autres
// écrans (accueil, historique, exports, clôture) affichent `computePeriodStats`, qui fige
// le coût à la vente (`cost_at_sale`, cf. ERR-DATA-001). L'onglet Bénéfice est lui
// RÉACTIF : corriger le coût d'achat d'un produit change ici le bénéfice affiché sans
// attendre une revente.
//
// Comme `computePeriodStats`, elle ne lit AUCUNE charge de base : les charges saisies
// (service, business) se soustraient à l'écran, sur la même période que le bénéfice.

import type { Product, SaleItem } from "@/lib/db";
import { soldProductsByCategory } from "./sold-products-by-category";

export interface PeriodProfit {
  /** Σ (CA − coût actuel × quantité) des produits vendus. Une marge SEULEMENT pour eux. */
  productMargin: number;
  /**
   * Σ CA des prestations vendues. Une prestation n'a pas de coût unitaire — son poids
   * d'exploitation passe par les charges de service que le commerçant saisit par période.
   */
  serviceRevenue: number;
  /** Catégories où au moins une prestation a été vendu sur la période. */
  serviceCategories: string[];
  /** CA de la période par catégorie — même clé que `serviceCategories`. */
  categoryRevenue: Record<string, number>;
  /** Produits vendus sans coût d'achat saisi — preuve du filet « bénéfice surestimé ». */
  soldWithoutCost: number;
}

export function periodProfit(products: Product[], items: SaleItem[]): PeriodProfit {
  let productMargin = 0;
  let serviceRevenue = 0;
  let soldWithoutCost = 0;
  const serviceCategories = new Set<string>();
  const categoryRevenue: Record<string, number> = {};

  for (const [category, list] of soldProductsByCategory(products, items)) {
    let aService = false;
    for (const sold of list) {
      categoryRevenue[category] = (categoryRevenue[category] ?? 0) + sold.revenue;
      if (sold.product.type === "service") {
        serviceRevenue += sold.revenue;
        aService = true;
      } else {
        productMargin += sold.revenue - sold.product.cost * sold.quantity;
        if (!sold.product.cost) soldWithoutCost += 1;
      }
    }
    if (aService) serviceCategories.add(category);
  }

  return {
    productMargin,
    serviceRevenue,
    serviceCategories: [...serviceCategories],
    categoryRevenue,
    soldWithoutCost,
  };
}
