import { useQuery } from "@tanstack/react-query";
import { getSaleItemsForSales, listExpenses, listSales } from "@/lib/db";

/**
 * Ventes, lignes de vente et dépenses d'un intervalle [from, to[, en requêtes indexées.
 *
 * La clé garde le préfixe ["sales"] : les mutations existantes (validation d'une vente,
 * annulation, clôture, ajout de dépense) invalident déjà ce préfixe, rien à câbler en
 * plus. Les dépenses voyagent avec les ventes plutôt que dans leur propre query parce
 * qu'aucun écran n'affiche un bénéfice net sans avoir aussi besoin des revenus.
 */
export function usePeriodData(from: number, to: number) {
  return useQuery({
    queryKey: ["sales", "range", from, to],
    queryFn: async () => {
      const [sales, expenses] = await Promise.all([listSales(from, to), listExpenses(from, to)]);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items, expenses };
    },
  });
}
