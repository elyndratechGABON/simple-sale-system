import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listProducts,
  listSalesToday,
  getSaleItemsForSales,
  listSales,
  listOpenTables,
} from "@/lib/db";
import {
  computePeriodStats,
  computeWeightSales,
  lastDaysRange,
  scopeByDevice,
} from "@/lib/analytics";
import { buildAlerts } from "@/lib/alerts";
import { formatDayShort } from "@/lib/format";
import { usePreferences } from "@/hooks/use-preferences";
import { useAccess } from "@/hooks/use-access";
import { ensureIdentity } from "@/lib/syncengine/identity";

export function useDashboardData() {
  // DONNÉES CONSERVÉES — logique métier inchangée (scopeByDevice, today/fortnight)
  const { workspaceName, ownerName } = usePreferences();
  const prefs = usePreferences();
  const cluster = prefs.cluster;
  const isService = cluster === "service";
  const hasWeightInput = cluster === "personnalise" && prefs.customUnitType === "weight";
  const access = useAccess();
  // L'IDENTITÉ de l'écran (SES ventes) : un employé ne voit que ses encaissements sur
  // son tableau de bord — jamais le cumul du groupe, qui n'appartient qu'au propriétaire.
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    staleTime: 60_000,
  });
  const deviceId = access.isOwner ? undefined : identity?.deviceId;
  // « Bonjour » : celui qui tient la caisse — l'employé sur une caisse employé, le
  // propriétaire sur sa caisse. Repli sur l'enseigne tant qu'aucun nom n'est renseigné.
  const greetingName =
    (identity?.role === "employee" ? identity.employeeName.trim() : ownerName) || workspaceName;
  const todayRange = useMemo(() => lastDaysRange(1), []);
  // 14 jours : les 7 derniers = semaine courante, les 7 d'avant = base de comparaison.
  // lastDaysRange(14).to === lastDaysRange(7).to (fin de journée, aujourd'hui inclus).
  const fortnightRange = useMemo(() => lastDaysRange(14), []);
  const weekRange = useMemo(
    () => ({ from: fortnightRange.to - 7 * 86_400_000, to: fortnightRange.to }),
    [fortnightRange],
  );

  const { data: todayData } = useQuery({
    queryKey: ["sales", "range", todayRange.from, todayRange.to],
    queryFn: async () => {
      const sales = await listSalesToday();
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
    refetchInterval: 10_000,
  });

  const { data: fortnightData } = useQuery({
    queryKey: ["sales", "range", fortnightRange.from, fortnightRange.to],
    queryFn: async () => {
      const sales = await listSales(fortnightRange.from, fortnightRange.to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
    refetchInterval: 10_000,
  });

  // Les ventes « dans le périmètre » de l'écran : tout pour le propriétaire, SES ventes
  // seulement pour un employé. Tout ce qui suit (KPIs, semaine, activité récente) se
  // calcule sur ce périmètre, jamais sur l'ensemble du groupe.
  const todayScoped = useMemo(
    () => (todayData ? scopeByDevice(todayData.sales, todayData.items, deviceId) : null),
    [todayData, deviceId],
  );
  const fortnightScoped = useMemo(
    () =>
      fortnightData ? scopeByDevice(fortnightData.sales, fortnightData.items, deviceId) : null,
    [fortnightData, deviceId],
  );
  const todayRev = todayScoped ? todayScoped.sales.reduce((s, x) => s + x.total, 0) : 0;
  const todaySalesCount = todayScoped ? todayScoped.sales.length : 0;
  const todayCustomers = todayScoped ? todayScoped.items.length : 0;
  const avgPanier =
    todayRev > 0 && todaySalesCount > 0 ? Math.round(todayRev / todaySalesCount) : 0;

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
    refetchInterval: 10_000,
  });

  const { data: openTables } = useQuery({
    queryKey: ["open_tables"],
    queryFn: listOpenTables,
    staleTime: 30_000,
    refetchInterval: 10_000,
  });

  // Ventes au poids (boucherie) : le poids vendu vit sur les lignes de vente des
  // produits vendus au kilo. Seules les lignes portant le poids comptent.
  const weightSales = useMemo(
    () =>
      fortnightScoped && (fortnightScoped.items.length > 0 || (products ?? []).length > 0)
        ? computeWeightSales(fortnightScoped.items, products ?? [])
        : null,
    [fortnightScoped, products],
  );

  const { weekStats, prevStats } = useMemo(() => {
    if (!fortnightScoped) return { weekStats: null, prevStats: null };
    return {
      weekStats: computePeriodStats(
        fortnightScoped.sales,
        fortnightScoped.items,
        weekRange.from,
        weekRange.to,
      ),
      prevStats: computePeriodStats(
        fortnightScoped.sales,
        fortnightScoped.items,
        fortnightRange.from,
        weekRange.from,
      ),
    };
  }, [fortnightScoped, weekRange, fortnightRange]);

  const alerts = useMemo(
    () => buildAlerts(products ?? [], openTables ?? []),
    [products, openTables],
  );

  // Pas de base de comparaison (semaine précédente vide) → NaN → « — » affiché,
  // plutôt qu'un « +100 % » mensonger sur une reprise d'activité.
  const revenueDelta =
    prevStats && prevStats.revenue > 0 && weekStats
      ? (weekStats.revenue - prevStats.revenue) / prevStats.revenue
      : Number.NaN;

  const recentSales = useMemo(() => {
    if (!fortnightScoped) return [];
    const itemsBySale = new Map<string, { name: string; quantity: number }[]>();
    for (const item of fortnightScoped.items) {
      const lines = itemsBySale.get(item.sale_id);
      if (lines) lines.push({ name: item.name, quantity: item.quantity });
      else itemsBySale.set(item.sale_id, [{ name: item.name, quantity: item.quantity }]);
    }
    return [...fortnightScoped.sales]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
      .map((sale) => ({
        id: sale.id,
        timestamp: sale.timestamp,
        total: sale.total ?? 0,
        items: itemsBySale.get(sale.id) ?? [],
      }));
  }, [fortnightScoped]);

  const catalogueEmpty = (products?.length ?? 0) === 0;
  const topProducts = weekStats?.topProducts.slice(0, 3) ?? [];
  const weekChartData =
    weekStats?.days.map((d) => ({
      day: formatDayShort(d.day),
      revenue: Math.max(0, Math.round(d.revenue)),
    })) ?? [];

  return {
    greetingName,
    isService,
    hasWeightInput,
    todayRev,
    todaySalesCount,
    todayCustomers,
    avgPanier,
    catalogueEmpty,
    topProducts,
    weekStats,
    weekChartData,
    revenueDelta,
    weightSales,
    recentSales,
    alerts,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
