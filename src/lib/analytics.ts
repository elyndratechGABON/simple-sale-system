// Agrégations des rapports.
//
// Contrat : fonctions PURES. Elles ne touchent ni IndexedDB ni React — elles reçoivent
// des `Sale[]` / `SaleItem[]` déjà chargés. C'est ce qui permet aux rapports et aux
// quatre exports de partager exactement les mêmes chiffres, et de vérifier un KPI en
// recalculant à la main.
//
// Le bénéfice se lit toujours dans la ligne de vente (`cost_at_sale`), jamais dans la
// fiche produit — cf. l'invariant de src/lib/db.ts.
import { eachDayOfInterval, startOfDay, subDays } from "date-fns";
import type { Category, Expense, Sale, SaleItem } from "./db";

export interface DayBucket {
  day: number; // minuit local, en ms — même clé de regroupement que src/routes/history.tsx
  revenue: number;
  /** Bénéfice BRUT du jour : revenus − coûts d'acquisition. Hors dépenses. */
  profit: number;
  /** Dépenses enregistrées ce jour-là. */
  expenses: number;
  /** Bénéfice NET : `profit − expenses`. Peut être négatif. */
  netProfit: number;
  salesCount: number;
}

export interface CategoryBucket {
  category: Category;
  revenue: number;
  profit: number;
}

export interface TableBucket {
  /** Libellé de la table ; « Comptoir » pour les ventes sans table. */
  label: string;
  revenue: number;
  /** Bénéfice BRUT des ventes de cette table : revenus − coûts figés dans les lignes. */
  profit: number;
  /** Nombre de tournées : groupes de lignes partageant la même vente et le même
   *  `ordered_at`. Une table réglée d'un coup compte autant de tournées que d'heures de
   *  commande ; des tournées encaissées séparément comptent chacune pour une. */
  rounds: number;
  salesCount: number;
  /** Personnes servies — somme des `customers_count` des ventes de la table. */
  clients: number;
}

export interface ProductBucket {
  /** Nom du produit à la vente. Figé dans la ligne comme le prix : une fiche renommée
   *  laisse l'ancien nom sur ses ventes déjà enregistrées. */
  name: string;
  category: Category;
  quantity: number;
  revenue: number;
  /** Bénéfice BRUT : revenus − coûts figés dans les lignes. */
  profit: number;
}

export interface PeriodStats {
  revenue: number;
  /** Bénéfice BRUT : revenus − coûts d'acquisition figés dans les lignes de vente. */
  profit: number;
  /** Somme des dépenses de la période. */
  expenses: number;
  /** Bénéfice NET : `profit − expenses`. C'est le vrai résultat, et il peut être négatif. */
  netProfit: number;
  salesCount: number;
  itemsCount: number;
  /** Nombre de personnes servies. Une vente sans `customers_count` compte pour 1. */
  customersCount: number;
  /** profit / revenue, dans [0,1]. 0 quand il n'y a pas de revenu. Marge BRUTE. */
  marginRate: number;
  /** netProfit / revenue. Peut être négatif quand les dépenses dépassent le bénéfice brut. */
  netMarginRate: number;
  /** revenue / salesCount, 0 quand il n'y a pas de vente. */
  averageBasket: number;
  /** Jour au chiffre d'affaires le plus élevé. */
  bestDay: DayBucket | null;
  /** Jour le moins rentable — bénéfice NET minimum PARMI LES JOURS AYANT EU DE L'ACTIVITÉ
   *  (vente ou dépense). Sans ce filtre le résultat serait toujours un jour de fermeture,
   *  ce qui n'apprend rien. Le net et non le brut : une journée sans vente mais avec un
   *  loyer à payer est exactement la journée qu'on cherche à repérer. */
  worstDay: DayBucket | null;
  /** Croissance entre la 1re et la 2e moitié de la période. `NaN` quand la 1re moitié
   *  n'a rien vendu : il n'y a pas de base de comparaison, et afficher « +0 % » ferait
   *  croire à une stagnation alors que l'activité est partie de zéro. `formatPercent`
   *  rend « — » dans ce cas. */
  growthRate: number;
  byCategory: CategoryBucket[];
  /** Répartition des revenus et bénéfices par table, de la plus rentable à la moins.
   *  Les ventes sans table sont regroupées sous « Comptoir » — c'est ce qui permet de
   *  faire la somme de la colonne sans deviner où est passé le chiffre du comptoir. */
  byTable: TableBucket[];
  /** Classement des produits par chiffre d'affaires décroissant. Clé : `product_id`
   *  quand la ligne vient du catalogue, nom pour les lignes libres — deux produits du
   *  catalogue homonymes ne fusionnent pas. */
  topProducts: ProductBucket[];
  /** Série chronologique COMPLÈTE, jours sans vente inclus à 0 — sinon la courbe
   *  raccourcirait les creux au lieu de les montrer. */
  days: DayBucket[];
}

export const lineRevenue = (i: SaleItem) => i.price_at_sale * i.quantity;
// cost_at_sale est absent des ventes antérieures au suivi du prix d'acquisition : leur
// bénéfice vaut alors leur chiffre d'affaires.
export const lineProfit = (i: SaleItem) => (i.price_at_sale - (i.cost_at_sale ?? 0)) * i.quantity;
// category_at_sale est absente pour la même raison, et pour les lignes libres d'avant
// l'ajout du champ Catégorie.
export const lineCategory = (i: SaleItem): Category => i.category_at_sale ?? "Autre";

export const dayKey = (ts: number) => startOfDay(ts).getTime();

/** Bornes [from, to[ des `days` derniers jours, aujourd'hui inclus. */
export function lastDaysRange(days: number): { from: number; to: number } {
  const today = startOfDay(new Date());
  return {
    from: subDays(today, days - 1).getTime(),
    to: today.getTime() + 86400000,
  };
}

export function computePeriodStats(
  sales: Sale[],
  items: SaleItem[],
  from: number,
  to: number,
  expenses: Expense[] = [],
): PeriodStats {
  const inRange = sales.filter((s) => s.timestamp >= from && s.timestamp < to);
  const saleIds = new Set(inRange.map((s) => s.id));
  const inRangeItems = items.filter((i) => saleIds.has(i.sale_id));
  const saleDay = new Map(inRange.map((s) => [s.id, dayKey(s.timestamp)]));
  const inRangeExpenses = expenses.filter((e) => e.timestamp >= from && e.timestamp < to);

  // Squelette : tous les jours de l'intervalle, à zéro.
  const buckets = new Map<number, DayBucket>();
  for (const d of eachDayOfInterval({ start: from, end: to - 1 })) {
    buckets.set(d.getTime(), {
      day: d.getTime(),
      revenue: 0,
      profit: 0,
      expenses: 0,
      netProfit: 0,
      salesCount: 0,
    });
  }

  for (const s of inRange) {
    const b = buckets.get(dayKey(s.timestamp));
    if (b) b.salesCount += 1;
  }

  let expensesTotal = 0;
  for (const e of inRangeExpenses) {
    expensesTotal += e.amount;
    const b = buckets.get(dayKey(e.timestamp));
    if (b) b.expenses += e.amount;
  }

  const categories = new Map<Category, CategoryBucket>();
  const products = new Map<string, ProductBucket>();
  let revenue = 0;
  let profit = 0;
  let itemsCount = 0;

  for (const item of inRangeItems) {
    const r = lineRevenue(item);
    const p = lineProfit(item);
    revenue += r;
    profit += p;
    itemsCount += item.quantity;

    const day = saleDay.get(item.sale_id);
    const bucket = day === undefined ? undefined : buckets.get(day);
    if (bucket) {
      bucket.revenue += r;
      bucket.profit += p;
    }

    const cat = lineCategory(item);
    const c = categories.get(cat);
    if (c) {
      c.revenue += r;
      c.profit += p;
    } else {
      categories.set(cat, { category: cat, revenue: r, profit: p });
    }

    const productKey = item.product_id ?? item.name;
    const prod = products.get(productKey);
    if (prod) {
      prod.quantity += item.quantity;
      prod.revenue += r;
      prod.profit += p;
    } else {
      products.set(productKey, {
        name: item.name,
        category: cat,
        quantity: item.quantity,
        revenue: r,
        profit: p,
      });
    }
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
  for (const d of days) d.netProfit = d.profit - d.expenses;

  const sold = days.filter((d) => d.salesCount > 0);
  // Le pire jour se cherche parmi les jours ACTIFS — vente OU dépense. Une journée
  // fermée avec un loyer prélevé est un jour à perte réel, pas un artefact.
  const active = days.filter((d) => d.salesCount > 0 || d.expenses > 0);
  const netProfit = profit - expensesTotal;

  return {
    revenue,
    profit,
    expenses: expensesTotal,
    netProfit,
    salesCount: inRange.length,
    itemsCount,
    // `?? 1` : les ventes antérieures au compteur n'ont pas le champ, elles valent
    // une personne chacune — la lecture la plus proche de la réalité.
    customersCount: inRange.reduce((s, sale) => s + (sale.customers_count ?? 1), 0),
    marginRate: revenue > 0 ? profit / revenue : 0,
    netMarginRate: revenue > 0 ? netProfit / revenue : 0,
    averageBasket: inRange.length > 0 ? revenue / inRange.length : 0,
    bestDay: sold.reduce<DayBucket | null>((a, d) => (!a || d.revenue > a.revenue ? d : a), null),
    worstDay: active.reduce<DayBucket | null>(
      (a, d) => (!a || d.netProfit < a.netProfit ? d : a),
      null,
    ),
    growthRate: computeGrowthRate(days),
    byCategory: Array.from(categories.values()).sort((a, b) => b.revenue - a.revenue),
    byTable: Array.from(byTable.values()).sort((a, b) => b.revenue - a.revenue),
    topProducts: Array.from(products.values()).sort((a, b) => b.revenue - a.revenue),
    days,
  };
}

/** Compare le chiffre d'affaires des deux moitiés de la période. Renvoie NaN quand la
 *  comparaison n'a pas de sens : période d'un seul jour, ou 1re moitié sans vente. */
function computeGrowthRate(days: DayBucket[]): number {
  if (days.length < 2) return Number.NaN;
  const half = Math.floor(days.length / 2);
  const first = days.slice(0, half).reduce((s, d) => s + d.revenue, 0);
  const second = days.slice(days.length - half).reduce((s, d) => s + d.revenue, 0);
  if (first === 0) return Number.NaN;
  return (second - first) / first;
}
