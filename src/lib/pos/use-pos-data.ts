import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listProducts,
  listOpenTables,
  listSalesToday,
  getSaleItems,
  getSaleItemsForSales,
} from "@/lib/db";
import { MONTHS, rangeFor, type CalendarView } from "@/lib/reports/period";
import { usePeriodData } from "@/hooks/use-period-data";
import { usePreferences } from "@/hooks/use-preferences";
import { computePeriodStats, computeWeightSales } from "@/lib/analytics";
import type { PeriodStats, DayBucket, WeightSalesStats } from "@/lib/analytics";

export function usePosQueries(focusedDay: number, view: CalendarView, activeTableId?: string) {
  const prefs = usePreferences();
  const cluster = prefs.cluster;
  const isService = cluster === "service";
  const hasWeightInput = cluster === "personnalise" && prefs.customUnitType === "weight";
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  const { data: openTables = [] } = useQuery({
    queryKey: ["sales", "open"],
    queryFn: listOpenTables,
  });
  const { data: salesToday = [] } = useQuery({
    queryKey: ["sales", "today"],
    queryFn: listSalesToday,
    refetchInterval: 10_000,
  });

  const range = useMemo(() => rangeFor(focusedDay, view), [view, focusedDay]);
  const { data } = usePeriodData(range.from, range.to);
  const stats = useMemo(
    () => (data ? computePeriodStats(data.sales, data.items, range.from, range.to) : null),
    [data, range.from, range.to],
  );

  const days = useMemo(() => new Map((stats?.days ?? []).map((d) => [d.day, d])), [stats]);

  const months = useMemo(() => {
    if (view !== "year" || !stats) return [];
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
  }, [view, stats]);

  const weightSales = useMemo(
    () =>
      data && (data.items.length > 0 || (products ?? []).length > 0)
        ? computeWeightSales(data.items, products ?? [])
        : null,
    [data, products],
  );

  const bestLabel = useMemo(() => {
    if (view === "year") {
      let best: (typeof months)[number] | null = null;
      for (const m of months) if (!best || m.revenue > best.revenue) best = m;
      return best && best.revenue > 0 ? best.label : "—";
    }
    return stats?.bestDay
      ? new Date(stats.bestDay.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      : "—";
  }, [view, stats, months]);

  const showSector = isService
    ? (stats?.salesCount ?? 0) > 0
    : hasWeightInput
      ? (weightSales?.weightKg ?? 0) > 0
      : false;

  const { data: tableItems = [] } = useQuery({
    queryKey: ["sale_items", activeTableId],
    queryFn: () => (activeTableId ? getSaleItems(activeTableId) : []),
    enabled: Boolean(activeTableId),
  });
  const { data: todayItems = [] } = useQuery({
    queryKey: ["sale_items", "popular", salesToday.map((s) => s.id).join(",")],
    queryFn: () => getSaleItemsForSales(salesToday.map((s) => s.id)),
    enabled: salesToday.length > 0,
  });

  return {
    products,
    openTables,
    salesToday,
    tableItems,
    todayItems,
    stats,
    days,
    months,
    weightSales,
    bestLabel,
    showSector,
  };
}
