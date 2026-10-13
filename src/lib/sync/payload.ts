import { computePeriodStats, lastDaysRange } from "@/lib/analytics";
import { getSaleItemsForSales, listSales } from "@/lib/db";

/** Agrégats LÉGERS des 7 derniers jours — pas de dump d'IndexedDB, pas de données sensibles. */
export async function buildLightPayload() {
  const { from, to } = lastDaysRange(7);
  const sales = await listSales(from, to);
  const items = await getSaleItemsForSales(sales.map((s) => s.id));
  const stats = computePeriodStats(sales, items, from, to);
  return {
    generated_at: Date.now(),
    period_days: 7,
    totals: {
      revenue: stats.revenue,
      profit: stats.profit,
      sales: stats.salesCount,
      items: stats.itemsCount,
      customers: stats.customersCount,
    },
    by_day: stats.days.map((d) => ({
      day: d.day,
      revenue: d.revenue,
      profit: d.profit,
      sales: d.salesCount,
    })),
    top_products: stats.topProducts.slice(0, 5).map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
    })),
  };
}
