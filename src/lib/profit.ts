// Calculateur de bénéfice mensuel du header (« CA & bénéfices »).
//
// Contrat : fonctions PURES, comme analytics.ts. Elles reçoivent des données déjà
// chargées, ne touchent ni IndexedDB ni React.
//
// Formule figée (accord utilisateur) :
//   Bénéfice du mois = CA du mois − COGS − complément de coût − charges fixes
//   COGS  = Σ `cost_at_sale` × quantité, figés dans les lignes de vente du mois.
//   La valeur du stock restant est AFFICHÉE comme repère, jamais soustraite.
import type { Product, SaleItem } from "./db";

/** Clé du mois local : « YYYY-MM ». */
export function monthKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

/** Bornes [from, to[ du mois « YYYY-MM » en heure locale. */
export function monthRange(key: string): { from: number; to: number } {
  const [y, m] = key.split("-").map(Number);
  return { from: new Date(y, m - 1, 1).getTime(), to: new Date(y, m, 1).getTime() };
}

export function previousMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

export function nextMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 1);
  return monthKey(d);
}

/** En-tête lisible pour l'écran, ex. « août 2026 ». */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

/** Produit consommable, soigné par le calcul de la valeur de stock : ni service, ni
 *  actif de location, stock borné. */
export function isConsumableStock(p: Product): boolean {
  return p.type !== "service" && !p.is_asset && Number.isFinite(p.stock);
}

export interface StockEstimate {
  /** Σ stock × coût des produits consommables. */
  value: number;
  /** Nombre de produits dont le coût est renseigné (> 0) et retenu. */
  known: number;
  /** Nombre total de produits consommables au stock borné. */
  total: number;
}

/** Valeur automatique du stock restant. `known < total` = évaluation partielle. */
export function estimateStockValue(products: Product[]): StockEstimate {
  let value = 0;
  let known = 0;
  let total = 0;
  for (const p of products) {
    if (!isConsumableStock(p)) continue;
    total += 1;
    if (p.cost > 0) {
      value += p.stock * p.cost;
      known += 1;
    }
  }
  return { value, known, total };
}

export interface MonthlyCogs {
  /** Coût des produits vendus : Σ cost_at_sale × quantité sur les lignes du mois. */
  cost: number;
  /** Chiffre d'affaires porté par ces lignes : Σ price_at_sale × quantité. */
  revenue: number;
  /** Part du CA (en [0,1]) portée par des lignes à coût connu (> 0). 1 = « calculé ». */
  coverage: number;
  /** Nombre de lignes vendues sans coût renseigné. */
  unknownLines: number;
}

export function monthlyCostOfGoods(items: SaleItem[]): MonthlyCogs {
  let cost = 0;
  let revenue = 0;
  let knownRevenue = 0;
  let unknownLines = 0;
  for (const i of items) {
    const r = i.price_at_sale * i.quantity;
    revenue += r;
    if (i.cost_at_sale > 0) {
      cost += i.cost_at_sale * i.quantity;
      knownRevenue += r;
    } else {
      unknownLines += 1;
    }
  }
  return {
    cost,
    revenue,
    coverage: revenue > 0 ? knownRevenue / revenue : 1,
    unknownLines,
  };
}

export interface MonthlyInput {
  revenue: number;
  cogs: number;
  costComplement: number;
  charges: number;
}

export interface MonthlyResult {
  profit: number;
  /** profit / revenue. 0 quand il n'y a pas de revenu. */
  marginRate: number;
}

export function computeMonthlyResult(input: MonthlyInput): MonthlyResult {
  const profit = input.revenue - input.cogs - input.costComplement - input.charges;
  return { profit, marginRate: input.revenue > 0 ? profit / input.revenue : 0 };
}

export type ResultStatus = "ok" | "warn" | "bad";

/** 🟢 profit ≥ 0 · 🟠 perte ≤ 10 % du CA · 🔴 sinon. Sans vente, le seuil d'alerte est nul. */
export function resultStatus(profit: number, revenue: number): ResultStatus {
  if (profit >= 0) return "ok";
  const threshold = revenue > 0 ? revenue * 0.1 : 0;
  return -profit <= threshold ? "warn" : "bad";
}
