import { useMemo } from "react";
import type { Product, SaleItem } from "@/lib/db";

/**
 * Les deux périmètres d'un même problème : des articles vendus dont le coût n'est pas
 * connu, et des articles du catalogue qui n'en ont pas.
 *
 * DÉRIVATION pure, aucune requête : la page charge déjà les deux listes (`useReportData`).
 * Ce hook ne fait que les trier, pour que la règle soit testable hors de l'écran.
 *
 * « Vendus » se lit sur le COÛT ACTUEL de la fiche, pas sur la ligne de vente : depuis que
 * l'onglet Bénéfice calcule le net au coût courant (`periodProfit`), l'alerte raconte la
 * même chose que lui — quand la saisie n'est pas faite, MÊME pour des ventes d'avant.
 * L'ancien prédicat (`cost_at_sale`, figé à la vente) laissait le bandeau allumé à vie :
 * la saisie n'y changeait rien, d'où son apparente erreur. Ça se déconnecte au premier
 * enregistrement du coût — la liste des articles suit le même prédicat que
 * `ProductCostsSection`.
 *
 * Les services (type === "service" ou category === "Service") n'ont PAS de coût d'achat :
 * ils ont des « charges de service » à la place. Ils ne doivent JAMAIS apparaître dans
 * l'alerte « sans coût » — ce bandeau ne concerne que les PRODUITS (biens physiques)
 * qui ont un stock et dont le coût d'achat n'est pas saisi.
 */
export function useCostAlerts(items: SaleItem[], products: Product[]) {
  const sold = useMemo(() => {
    // Vendus sur la période ET rattachés au catalogue. Une ligne libre n'a pas de fiche à
    // compléter, et un identifiant inconnu ne pourrait pas être mis à jour non plus.
    const ids = new Set(items.filter((i) => i.product_id).map((i) => i.product_id as string));
    return products.filter(
      (p) => ids.has(p.id) && p.type !== "service" && p.category !== "Service" && !(p.cost > 0),
    );
  }, [items, products]);

  const global = useMemo(
    () => products.filter((p) => p.type !== "service" && p.category !== "Service" && !(p.cost > 0)),
    [products],
  );

  return { sold, global };
}
