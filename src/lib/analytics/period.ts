import { eachDayOfInterval } from "date-fns";
import type { ProductExpense, Sale, SaleItem } from "@/lib/db";
import type { Category } from "@/lib/db";
import { computeGrowthRate } from "./day";
import { dayKey, lineCategory, lineProfit, lineRevenue } from "./lines";
import type { CategoryBucket, DayBucket, PeriodStats, ProductBucket, TableBucket } from "./types";

export function computePeriodStats(
  sales: Sale[],
  items: SaleItem[],
  from: number,
  to: number,
  productExpenses?: ProductExpense[],
): PeriodStats {
  const inRange = sales.filter((s) => s.timestamp >= from && s.timestamp < to);
  const saleIds = new Map(inRange.map((s) => [s.id, true]));
  const inRangeItems = items.filter((i) => saleIds.has(i.sale_id));
  const saleDay = new Map(inRange.map((s) => [s.id, dayKey(s.timestamp)]));

  // Squelette : tous les jours de l'intervalle, à zéro.
  const buckets = new Map<number, DayBucket>();
  for (const d of eachDayOfInterval({ start: from, end: to - 1 })) {
    buckets.set(d.getTime(), {
      day: d.getTime(),
      revenue: 0,
      profit: 0,
      salesCount: 0,
    });
  }

  for (const s of inRange) {
    const b = buckets.get(dayKey(s.timestamp));
    if (b) b.salesCount += 1;
  }

  // Map product_id → cost saisi pour cette période (upsert par product_id).
  const expenseByProduct = new Map<string, number>();
  if (productExpenses) {
    for (const e of productExpenses) {
      expenseByProduct.set(e.product_id, e.cost);
    }
  }

  const categories = new Map<Category, CategoryBucket>();
  const products = new Map<string, ProductBucket>();
  let revenue = 0;
  let profit = 0;
  let itemsCount = 0;

  for (const item of inRangeItems) {
    const r = lineRevenue(item);
    revenue += r;
    itemsCount += item.quantity;

    const day = saleDay.get(item.sale_id);
    const bucket = day === undefined ? undefined : buckets.get(day);
    if (bucket) {
      bucket.revenue += r;
      // Bénéfice du jour : coût figé dans la ligne, jamais le coût d'acquisition — cohérent
      // avec `computeDayDetail` (calendrier des rapports) qui alimente l'écran.
      bucket.profit += lineProfit(item);
    }

    const cat = lineCategory(item);
    const productKey = item.product_id ?? item.name;

    // Profit par produit = coût d'acquisition saisi (0 si pas encore saisi).
    // On accumule les revenus par produit, puis on calcule le profit à la fin.
    const prod = products.get(productKey);
    if (prod) {
      prod.quantity += item.quantity;
      prod.revenue += r;
    } else {
      products.set(productKey, {
        product_id: productKey,
        name: item.name,
        category: cat,
        quantity: item.quantity,
        revenue: r,
        profit: 0, // calculé plus bas
      });
    }

    // Catégorie : on accumule les revenus, profit calculé après.
    const c = categories.get(cat);
    if (c) {
      c.revenue += r;
    } else {
      categories.set(cat, { category: cat, revenue: r, profit: 0 });
    }
  }

  // Calcul du profit : SANS carte des coûts d'acquisition (`sync.ts`), on s'appuie sur le
  // coût d'acquisition FIGÉ dans chaque ligne de vente (`cost_at_sale`) — un profit à
  // 100 % du CA (coût absent) serait un faux chiffre pour le dashboard de l'orchestrateur.
  // AVEC la carte (`ProfitSheet`), on garde la sémantique « prix d'acquisition saisi pour
  // la période », qui s'applique produit par produit puis remonte catégorie, global et jour.
  const usingLineCosts = !productExpenses || productExpenses.length === 0;
  for (const [key, prod] of products) {
    if (usingLineCosts) {
      prod.profit = 0;
    } else {
      const cost = expenseByProduct.get(key) ?? 0;
      prod.profit = prod.revenue - cost;
    }
  }
  for (const item of inRangeItems) {
    const prod = products.get(item.product_id ?? item.name);
    if (usingLineCosts && prod) prod.profit += lineProfit(item);
  }

  // Profit par catégorie = somme des profits des produits de la catégorie.
  for (const [, cat] of categories) {
    cat.profit = 0;
  }
  for (const [, prod] of products) {
    const cat = categories.get(prod.category);
    if (cat) cat.profit += prod.profit;
  }

  // Profit global = somme des profits par produit.
  profit = 0;
  for (const [, prod] of products) {
    profit += prod.profit;
  }

  // Répartition par table. La clé de tournée est (sale_id, ordered_at) : une table
  // réglée d'un coup porte toutes ses tournées sous une seule vente, des tournées
  // encaissées séparément portent chacune la leur — les deux comptent pareil ici.
  const byTable = new Map<string, TableBucket>();
  const tableRounds = new Map<string, Set<string>>();
  const saleTable = new Map(inRange.map((s) => [s.id, s.table ?? "Comptoir"]));
  for (const item of inRangeItems) {
    const label = saleTable.get(item.sale_id) ?? "Comptoir";
    let bucket = byTable.get(label);
    if (!bucket) {
      bucket = { label, revenue: 0, profit: 0, rounds: 0, salesCount: 0, clients: 0 };
      byTable.set(label, bucket);
    }
    const r = lineRevenue(item);
    bucket.revenue += r;
    // Bénéfice BRUT (coûts figés dans la ligne) — il était resté à zéro : seuls les
    // revenus s'accumulaient ici.
    bucket.profit += lineProfit(item);
    let keys = tableRounds.get(label);
    if (!keys) {
      keys = new Set();
      tableRounds.set(label, keys);
    }
    keys.add(`${item.sale_id}::${item.ordered_at ?? 0}`);
  }
  for (const [label, keys] of tableRounds) {
    const bucket = byTable.get(label);
    if (bucket) bucket.rounds = keys.size;
  }
  for (const s of inRange) {
    const bucket = byTable.get(s.table ?? "Comptoir");
    if (bucket) {
      bucket.salesCount += 1;
      bucket.clients += s.customers_count ?? 1;
    }
  }

  const days = Array.from(buckets.values()).sort((a, b) => a.day - b.day);

  const sold = days.filter((d) => d.salesCount > 0);

  return {
    revenue,
    profit,
    salesCount: inRange.length,
    itemsCount,
    customersCount: inRange.reduce((s, sale) => s + (sale.customers_count ?? 1), 0),
    marginRate: revenue > 0 ? profit / revenue : 0,
    averageBasket: inRange.length > 0 ? revenue / inRange.length : 0,
    bestDay: sold.reduce<DayBucket | null>((a, d) => (!a || d.revenue > a.revenue ? d : a), null),
    worstDay: sold.reduce<DayBucket | null>((a, d) => (!a || d.profit < a.profit ? d : a), null),
    growthRate: computeGrowthRate(days),
    byCategory: Array.from(categories.values()).sort((a, b) => b.revenue - a.revenue),
    byTable: Array.from(byTable.values()).sort((a, b) => b.revenue - a.revenue),
    topProducts: Array.from(products.values()).sort((a, b) => b.revenue - a.revenue),
    days,
  };
}
