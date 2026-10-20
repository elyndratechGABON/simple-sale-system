import { computePeriodStats, lastDaysRange, scopeByDevice } from "@/lib/analytics";
import { getSaleItemsForSales, listSales } from "@/lib/db";
import { ensureIdentity, getIdentity } from "@/lib/syncengine/identity";

/** Agrégats LÉGERS des 7 derniers jours — pas de dump d'IndexedDB, pas de données sensibles. */
export async function buildLightPayload() {
  const { from, to } = lastDaysRange(7);
  await ensureIdentity();
  const identity = getIdentity();
  const sales = await listSales(from, to);
  const items = await getSaleItemsForSales(sales.map((s) => s.id));
  // La convergence P2P fait vivre sur chaque écran TOUTES les ventes du groupe. Un
  // employé n'exporte donc que SES encaissements ; le propriétaire exporte le cumul
  // (miroir du tableau de bord, useDashboardData). Sans ce filtre, chaque appareil du
  // compte envoyait le même total et le dashboard de l'orchestrateur — qui somme les
  // payloads par appareil — comptait chaque vente n fois.
  const scoped = scopeByDevice(
    sales,
    items,
    identity.role === "employee" ? identity.deviceId : undefined,
  );
  const stats = computePeriodStats(scoped.sales, scoped.items, from, to);
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
