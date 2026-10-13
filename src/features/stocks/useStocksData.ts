import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSaleItemsForSales, listProducts, listSales, type SaleItem } from "@/lib/db";
import { lastDaysRange } from "@/lib/analytics";

/**
 * Données de la page Stocks : catalogue + ventes des 30 derniers jours, agrégées
 * côté client en « plus vendus » (quantités par produit) et « dernière vente ».
 *
 * Une seule requête de ventes, partagée par la clé React Query avec le dashboard
 * et les rapports.
 */
export function useStocksData() {
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const monthRange = useMemo(() => lastDaysRange(30), []);
  const { data: monthData } = useQuery({
    queryKey: ["sales", "range", monthRange.from, monthRange.to],
    queryFn: async () => {
      const sales = await listSales(monthRange.from, monthRange.to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
    staleTime: 60_000,
  });

  // « Plus vendus » : quantités vendues sur 30 jours, par product_id.
  const soldQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of monthData?.items ?? []) {
      if (!item.product_id) continue;
      map.set(item.product_id, (map.get(item.product_id) ?? 0) + item.quantity);
    }
    return map;
  }, [monthData]);

  // Date de la dernière vente de chaque produit sur 30 jours. Ventes triées du plus
  // ancien au plus récent pour laisser la dernière gagner.
  const lastSoldAtByProduct = useMemo(() => {
    const itemsBySale = new Map<string, SaleItem[]>();
    for (const it of monthData?.items ?? []) {
      const arr = itemsBySale.get(it.sale_id) ?? [];
      arr.push(it);
      itemsBySale.set(it.sale_id, arr);
    }
    const map = new Map<string, number>();
    const sales = [...(monthData?.sales ?? [])].sort((a, b) => a.timestamp - b.timestamp);
    for (const s of sales) {
      for (const it of itemsBySale.get(s.id) ?? []) {
        if (it.product_id && it.quantity > 0) map.set(it.product_id, s.timestamp);
      }
    }
    return map;
  }, [monthData]);

  return { products, soldQtyByProduct, lastSoldAtByProduct };
}
