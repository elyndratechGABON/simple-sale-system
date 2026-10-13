// Agrégations des rapports.
//
// Contrat : fonctions PURES. Elles ne touchent ni IndexedDB ni React — elles reçoivent
// des `Sale[]` / `SaleItem[]` déjà chargés. C'est ce qui permet aux rapports et aux
// quatre exports de partager exactement les mêmes chiffres, et de vérifier un KPI en
// recalculant à la main.
//
// Le bénéfice est calculé depuis les coûts d'acquisition saisis dans les rapports
// (table `product_expenses`), pas depuis `cost_at_sale` figé dans les lignes de vente.
//
// (types.ts) formes des agrégats ; (lines.ts) calculs par ligne ;
// (day.ts) détail d'un jour ; (period.ts) stats d'une période ; (weight.ts) ventes au poids.
export { computeDayDetail, lastDaysRange, scopeByDevice } from "./day";
export { dayKey, lineCategory, lineProfit, lineRevenue } from "./lines";
export { computePeriodStats } from "./period";
export { computeWeightSales } from "./weight";
export type {
  CategoryBucket,
  DayBucket,
  DayDetail,
  DayProductBucket,
  PaymentBreakdown,
  PeriodStats,
  ProductBucket,
  TableBucket,
  WeightSalesBucket,
  WeightSalesStats,
} from "./types";
