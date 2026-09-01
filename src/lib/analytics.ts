// Agrégations des rapports.
//
// Contrat : fonctions PURES. Elles ne touchent ni IndexedDB ni React — elles reçoivent
// des `Sale[]` / `SaleItem[]` déjà chargés. C'est ce qui permet aux rapports et aux
// quatre exports de partager exactement les mêmes chiffres, et de vérifier un KPI en
// recalculant à la main.
//
// Le bénéfice est calculé depuis les coûts d'acquisition saisis dans les rapports
// (table `product_expenses`), pas depuis `cost_at_sale` figé dans les lignes de vente.
import { eachDayOfInterval, startOfDay, subDays } from "date-fns";
import type {
  Category,
  PaymentMethod,
  Product,
  ProductExpense,
  Rental,
  Sale,
  SaleItem,
} from "./db";

export interface DayBucket {
  day: number; // minuit local, en ms — même clé de regroupement que src/routes/history.tsx
  revenue: number;
  /** Bénéfice du jour : revenus − coûts d'acquisition. */
  profit: number;
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
  /** Clé de regroupement : `product_id` du catalogue, nom pour les lignes libres. C'est
   *  ELLE qui relie le lot aux coûts d'acquisition saisis dans les rapports — chercher
   *  par nom fusionnerait deux produits homonymes ET raterait l'enregistrement. */
  product_id: string;
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
  /** Bénéfice : revenus − coûts d'acquisition figés dans les lignes de vente. */
  profit: number;
  salesCount: number;
  itemsCount: number;
  /** Nombre de personnes servies. Une vente sans `customers_count` compte pour 1. */
  customersCount: number;
  /** profit / revenue, dans [0,1]. 0 quand il n'y a pas de revenu. */
  marginRate: number;
  /** revenue / salesCount, 0 quand il n'y a pas de vente. */
  averageBasket: number;
  /** Jour au chiffre d'affaires le plus élevé. */
  bestDay: DayBucket | null;
  /** Jour le moins rentable — bénéfice minimum PARMI LES JOURS AYANT EU DES VENTES. Sans
   *  ce filtre le résultat serait toujours un jour de fermeture, ce qui n'apprend rien. */
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

/** Produit vendu un jour donné — agrégé par clé catalogue (nom pour les lignes libres). */
export interface DayProductBucket {
  product_id: string;
  name: string;
  category: Category;
  quantity: number;
  revenue: number;
}

/** Répartition d'un jour par moyen de paiement. */
export interface PaymentBreakdown {
  method: PaymentMethod;
  count: number;
  total: number;
}

/**
 * Photo complète d'une journée : le contenu du dialogue « détail d'un jour » du
 * calendrier des rapports. Pure et recalculable à la main, comme le reste du module.
 */
export interface DayDetail {
  revenue: number;
  profit: number;
  salesCount: number;
  itemsCount: number;
  /** Personnes servies — une vente sans `customers_count` compte pour 1. */
  customers: number;
  byPayment: PaymentBreakdown[];
  /** Produits triés par chiffre d'affaires décroissant. */
  products: DayProductBucket[];
  /** Noms des clients nommés (services), distincts, dans l'ordre de passage. */
  clients: string[];
  /** Libellés des tables servies, distincts. */
  tables: string[];
}

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

  // Calcul du profit par produit : on retire le coût d'acquisition du revenu du produit.
  for (const [key, prod] of products) {
    const cost = expenseByProduct.get(key) ?? 0;
    prod.profit = prod.revenue - cost;
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

// ── Agrégats location (cluster 'location') ───────────────────────────────────────
//
// Le revenu d'une location n'est PAS une vente : il vit dans le store `rentals`, jamais
// dans `sales`. La facturation reprend la formule de `use-rentals` (prix unitaire ×
// quantité × unités de temps, arrondies à l'unité supérieure) — recalée ici pour garder
// ce module PUR, sans dépendance vers un fichier de hooks.

const RENTAL_DAY_MS = 86_400_000;
const RENTAL_HOUR_MS = 3_600_000;

function rentalUnits(start: number, end: number, unit: Rental["pricing_unit"]): number {
  const ms = end - start;
  switch (unit) {
    case "hour":
      return Math.ceil(ms / RENTAL_HOUR_MS);
    case "day":
      return Math.ceil(ms / RENTAL_DAY_MS);
    case "week":
      return Math.ceil(ms / (7 * RENTAL_DAY_MS));
    case "month":
      return Math.ceil(ms / (30 * RENTAL_DAY_MS));
  }
}

/** Montant facturé d'une location : la durée retenue est la fin réelle si le retour est
 *  tombé (`actual_end_date`), la fin prévue sinon. */
function rentalRevenue(rental: Rental): number {
  const end = rental.actual_end_date ?? rental.expected_end_date;
  return (
    rental.price_per_unit *
    rental.quantity *
    rentalUnits(rental.start_date, end, rental.pricing_unit)
  );
}

export interface RentalAssetBucket {
  asset_id: string;
  name: string;
  rentalsCount: number;
  revenue: number;
}

export interface RentalStats {
  revenue: number;
  rentalsCount: number;
  /** Durée moyenne d'une location, exprimée dans l'unité la plus parlante du parc. */
  avgDuration: number;
  /** Unité de `avgDuration` : "heure" si tout le parc est facturé à l'heure, sinon "jour". */
  avgDurationUnit: "heure" | "jour";
  byAsset: RentalAssetBucket[];
}

/** Agrège les locations d'une période : revenu total et par actif, nombre de locations,
 *  durée moyenne. Une location compte dans la période où elle COMMENCE (`start_date`). */
export function computeRentalStats(rentals: Rental[], from: number, to: number): RentalStats {
  const inRange = rentals.filter(
    (r) => r.status !== "cancelled" && r.start_date >= from && r.start_date < to,
  );

  const byAsset = new Map<string, RentalAssetBucket>();
  let revenue = 0;
  let durationMs = 0;

  for (const r of inRange) {
    const rev = rentalRevenue(r);
    revenue += rev;
    const bucket = byAsset.get(r.asset_id);
    if (bucket) {
      bucket.rentalsCount += 1;
      bucket.revenue += rev;
    } else {
      byAsset.set(r.asset_id, {
        asset_id: r.asset_id,
        name: r.asset_name,
        rentalsCount: 1,
        revenue: rev,
      });
    }
    const end = r.actual_end_date ?? r.expected_end_date;
    durationMs += Math.max(0, end - r.start_date);
  }

  const allHourly = inRange.length > 0 && inRange.every((r) => r.pricing_unit === "hour");
  const avgSeconds = inRange.length > 0 ? durationMs / inRange.length / 1000 : 0;

  return {
    revenue,
    rentalsCount: inRange.length,
    avgDuration: allHourly ? avgSeconds / 3600 : avgSeconds / 86400,
    avgDurationUnit: allHourly ? "heure" : "jour",
    byAsset: Array.from(byAsset.values()).sort((a, b) => b.revenue - a.revenue),
  };
}

// ── Taux d'occupation (cluster 'location') ───────────────────────────────────────
//
// Pourcentage du parc loué sur une fenêtre : durée facturée (overlaps fenêtre) ×
// quantité, rapportée à la capacité (unités physiques × durée de la fenêtre). Seules
// les unités connues (`total_units`, sinon `stock`) sont comptées. Sans capacité
// connu, le taux vaut NaN (l'affichage montre « — »).

export interface RentalOccupancyBucket {
  asset_id: string;
  name: string;
  /** Taux d'occupation de l'actif sur la fenêtre, dans [0,1]. Peut valoir NaN si la
   *  capacité de l'actif est inconnue. */
  rate: number;
}

export interface RentalOccupancyStats {
  /** Occupation rapportée à la cellule colorée, par actif. */
  byAsset: RentalOccupancyBucket[];
  /** Taux d'occupation du parc entier sur la fenêtre, dans [0,1]. NaN sans capacité. */
  rate: number;
}

/** Taux d'occupation du parc sur [`from`, `to[`. Une location qui déborde de la fenêtre
 *  compte pour la seule partie qui y tombe ; les locations annulées sont ignorées. */
export function computeRentalOccupancy(
  rentals: Rental[],
  products: Pick<Product, "id" | "name" | "is_asset" | "total_units" | "stock">[],
  from: number,
  to: number,
): RentalOccupancyStats {
  const windowMs = Math.max(0, to - from);

  // Capacité par actif (unités physiques) — seuls les actifs de location comptent.
  const units = new Map<string, number>();
  for (const p of products) {
    if (p.is_asset !== true && p.total_units == null) continue;
    const n = p.total_units ?? p.stock;
    if (Number.isFinite(n) && n > 0) units.set(p.id, n);
  }

  // Unités·durée occupées sur la fenêtre, par actif.
  const occupiedMs = new Map<string, number>();
  let totalOccupied = 0;
  for (const r of rentals) {
    if (r.status === "cancelled") continue;
    const cap = units.get(r.asset_id);
    if (cap === undefined) continue; // actif inconnu : aucune capacité à rapporter dessus
    const end = r.actual_end_date ?? r.expected_end_date;
    const overlap = Math.max(0, Math.min(end, to) - Math.max(r.start_date, from));
    if (overlap <= 0) continue;
    const occ = overlap * r.quantity;
    occupiedMs.set(r.asset_id, (occupiedMs.get(r.asset_id) ?? 0) + occ);
    totalOccupied += occ;
  }

  let capacity = 0;
  for (const n of units.values()) capacity += n * windowMs;

  const byAsset: RentalOccupancyBucket[] = units.size
    ? Array.from(units.entries())
        .map(([asset_id, unitCount]) => {
          const occ = occupiedMs.get(asset_id) ?? 0;
          const cap = unitCount * windowMs;
          return {
            asset_id,
            name: products.find((p) => p.id === asset_id)?.name ?? asset_id,
            rate: cap > 0 ? occ / cap : Number.NaN,
          };
        })
        .sort((a, b) => {
          const ra = Number.isFinite(a.rate) ? a.rate : -1;
          const rb = Number.isFinite(b.rate) ? b.rate : -1;
          return rb - ra;
        })
    : [];

  return {
    byAsset,
    rate: capacity > 0 ? totalOccupied / capacity : Number.NaN,
  };
}
