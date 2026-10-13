// Données de la page Comptabilité : ce que la requête de période produit une fois
// brassé (série par jour, agrégation mensuelle, ventes au poids).
//
// Extrait du shell parce que ce sont des DÉRIVATIONS, pas de l'affichage : la page ne
// faisait que les empiler entre deux JSX, et aucune n'était réutilisable ni testable.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProducts, type Product } from "@/lib/db";
import {
  computePeriodStats,
  computeWeightSales,
  type DayBucket,
  type PeriodStats,
  type WeightSalesStats,
} from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { MONTHS, rangeFor, type CalendarView } from "@/lib/reports/period";

export type MonthBucket = { label: string; month: number; revenue: number; salesCount: number };

/** Agrège la série journalière en 12 mois. VIDE hors vue « année » — c'est le seul
 *  moment où la grille des mois a un sens, et la calculer autrement coûterait une passe
 *  sur des données absentes. */
export function monthsFromDays(stats: PeriodStats | null): MonthBucket[] {
  if (!stats) return [];
  const acc = new Map<number, { revenue: number; salesCount: number }>();
  for (const d of stats.days) {
    const m = new Date(d.day).getMonth();
    const cur = acc.get(m) ?? { revenue: 0, salesCount: 0 };
    cur.revenue += d.revenue;
    cur.salesCount += d.salesCount;
    acc.set(m, cur);
  }
  return MONTHS.map((label, month) => {
    const hit = acc.get(month);
    return { label, month, revenue: hit?.revenue ?? 0, salesCount: hit?.salesCount ?? 0 };
  });
}

/**
 * « Meilleur » dépend de la granularité : un jour en mois/semaine/jour, un mois en année.
 * Jamais de date codée en dur — la sortie est un libellé prêt à afficher.
 */
export function bestLabelOf(view: CalendarView, stats: PeriodStats | null, months: MonthBucket[]) {
  if (view === "year") {
    let best: MonthBucket | null = null;
    for (const m of months) if (!best || m.revenue > best.revenue) best = m;
    return best && best.revenue > 0 ? best.label : "—";
  }
  return stats?.bestDay
    ? new Date(stats.bestDay.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : "—";
}

export function useReportData(focusedDay: number, view: CalendarView) {
  // Une seule requête, indexée sur la période affichée. `computePeriodStats` renvoie
  // TOUS les jours de l'intervalle, à zéro quand il n'y a pas eu de vente : c'est cette
  // série qui alimente le calendrier, la semaine et l'année, donc pas de doublon.
  const range = useMemo(() => rangeFor(focusedDay, view), [view, focusedDay]);
  const { data } = usePeriodData(range.from, range.to);
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
    staleTime: 30_000,
  });

  const stats = useMemo(
    () => (data ? computePeriodStats(data.sales, data.items, range.from, range.to) : null),
    [data, range.from, range.to],
  );

  const days = useMemo(() => new Map((stats?.days ?? []).map((d) => [d.day, d])), [stats]);
  const months = useMemo(() => (view === "year" ? monthsFromDays(stats) : []), [view, stats]);

  const weightSales = useMemo(
    () =>
      data && (data.items.length > 0 || (products ?? []).length > 0)
        ? computeWeightSales(data.items, products ?? [])
        : null,
    [data, products],
  );

  // Le secteur affiché dépend du CLUSTER (`isService` / `hasWeightInput`), que ce hook
  // ignore volontairement : il ne connaît que les données. Le shell tranche avec sa
  // règle d'origine — service s'affiche s'il y a eu une vente, boucherie s'il y a eu du
  // poids, rien sinon.
  return {
    stats,
    days: days as Map<number, DayBucket>,
    months,
    weightSales: weightSales as WeightSalesStats | null,
    products: (products ?? []) as Product[],
    bestLabel: bestLabelOf(view, stats, months),
  };
}
