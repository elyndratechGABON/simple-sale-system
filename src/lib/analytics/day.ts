import { startOfDay, subDays } from "date-fns";
import type { PaymentMethod, Sale, SaleItem } from "@/lib/db";
import { lineCategory, lineProfit, lineRevenue } from "./lines";
import type { DayBucket, DayDetail, DayProductBucket, PaymentBreakdown } from "./types";

export function computeDayDetail(sales: Sale[], items: SaleItem[]): DayDetail {
  const byPaymentMap = new Map<PaymentMethod, PaymentBreakdown>();
  for (const s of sales) {
    const method = s.payment_method ?? "cash";
    const cur = byPaymentMap.get(method) ?? { method, count: 0, total: 0 };
    cur.count += 1;
    cur.total += s.total;
    byPaymentMap.set(method, cur);
  }

  const productMap = new Map<string, DayProductBucket>();
  for (const i of items) {
    const key = i.product_id ?? i.name;
    const cur = productMap.get(key) ?? {
      product_id: key,
      name: i.name,
      category: lineCategory(i),
      quantity: 0,
      revenue: 0,
    };
    cur.quantity += i.quantity;
    cur.revenue += lineRevenue(i);
    productMap.set(key, cur);
  }

  const clients = Array.from(
    new Set(sales.map((s) => s.client_name).filter((c): c is string => Boolean(c))),
  );
  const tables = Array.from(
    new Set(sales.map((s) => s.table).filter((t): t is string => Boolean(t))),
  );

  return {
    revenue: sales.reduce((s, x) => s + x.total, 0),
    profit: items.reduce((s, i) => s + lineProfit(i), 0),
    salesCount: sales.length,
    itemsCount: items.reduce((s, i) => s + i.quantity, 0),
    customers: sales.reduce((s, x) => s + (x.customers_count ?? 1), 0),
    byPayment: Array.from(byPaymentMap.values()),
    products: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue),
    clients,
    tables,
  };
}

/** Bornes [from, to[ des `days` derniers jours, aujourd'hui inclus. */
export function lastDaysRange(days: number): { from: number; to: number } {
  const today = startOfDay(new Date());
  return {
    from: subDays(today, days - 1).getTime(),
    to: today.getTime() + 86400000,
  };
}

/**
 * Restreint un jeu de ventes (et leurs lignes) à celles encaissées par UNE seule caisse de
 * l'exploitation. La convergence P2P fait vivre sur CHAQUE écran toutes les ventes du groupe —
 * un employé ENREGISTRE aussi les ventes du propriétaire et des collègues, mais son tableau de
 * bord ne doit refléter que SES encaissements ; seul le propriétaire voit le CUMUL. Sans
 * `deviceId` (caisse propriétaire), rien n'est filtré ; une vente sans `seller_device_id`
 * (tracé antérieur ou caisse qui ne se signait pas) n'est pas imputable à l'employé → exclue.
 */
export function scopeByDevice(
  sales: Sale[],
  items: SaleItem[],
  deviceId: string | undefined,
): { sales: Sale[]; items: SaleItem[] } {
  if (!deviceId) return { sales, items };
  const ids = new Set(sales.filter((s) => s.seller_device_id === deviceId).map((s) => s.id));
  return {
    sales: sales.filter((s) => ids.has(s.id)),
    items: items.filter((i) => ids.has(i.sale_id)),
  };
}

/** Compare le chiffre d'affaires des deux moitiés de la période. Renvoie NaN quand la
 *  comparaison n'a pas de sens : période d'un seul jour, ou 1re moitié sans vente. */
export function computeGrowthRate(days: DayBucket[]): number {
  if (days.length < 2) return Number.NaN;
  const half = Math.floor(days.length / 2);
  const first = days.slice(0, half).reduce((s, d) => s + d.revenue, 0);
  const second = days.slice(days.length - half).reduce((s, d) => s + d.revenue, 0);
  if (first === 0) return Number.NaN;
  return (second - first) / first;
}
