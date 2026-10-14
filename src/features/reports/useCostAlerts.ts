import { useMemo } from "react";
import type { Product, SaleItem } from "@/lib/db";

/**
 * Les deux périmètres d'un même problème : des articles vendus dont le coût n'est pas
 * connu, et des articles du catalogue qui n'en ont pas.
 *
 * DÉRIVATION pure, aucune requête : la page charge déjà les deux listes (`useReportData`).
 * Ce hook ne fait que les trier, pour que la règle soit testable hors de l'écran.
 *
 * « Vendus » se lit sur la LIGNE de vente (`cost_at_sale`), pas sur la fiche produit : le
 * coût est figé au moment de la vente, une saisie faite aujourd'hui ne réécrit pas les
 * ventes passées. D'où deux listes distinctes — l'alerte « vendus » explique un bénéfice
 * surestimé, la saisie ne guérit que l'avenir.
 */
export function useCostAlerts(items: SaleItem[], products: Product[]) {
  const sold = useMemo(() => {
    // Lignes sans coût ET rattachées au catalogue : une ligne libre n'a pas de fiche à
    // compléter, et un identifiant inconnu ne pourrait pas être mis à jour non plus.
    const ids = new Set(
      items.filter((i) => i.product_id && i.cost_at_sale <= 0).map((i) => i.product_id as string),
    );
    return products.filter((p) => ids.has(p.id));
  }, [items, products]);

  const global = useMemo(() => products.filter((p) => !p.cost || p.cost <= 0), [products]);

  return { sold, global };
}
