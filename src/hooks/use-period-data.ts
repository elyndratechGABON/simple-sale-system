import { useQuery } from "@tanstack/react-query";
import { getSaleItemsForSales, listSales } from "@/lib/db";

/**
 * Ventes et lignes de vente d'un intervalle [from, to[, en requêtes indexées.
 *
 * La clé garde le préfixe ["sales"] : les mutations existantes (validation d'une vente,
 * annulation, clôture) invalident déjà ce préfixe, rien à câbler en plus.
 */
export function usePeriodData(from: number, to: number) {
  return useQuery({
    queryKey: ["sales", "range", from, to],
    queryFn: async () => {
      const sales = await listSales(from, to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
  });
}
