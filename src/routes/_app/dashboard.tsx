// Page d'accueil — pilotage de l'activité.
//
// Salutation, KPIs du jour TOUJOURS visibles (zéro vente est une information, pas une
// absence d'écran), actions rapides adaptées au cluster métier, alertes contextuelles
// du moteur PUR src/lib/alerts.ts, performance de la semaine comparée à la précédente,
// top produits et activité récente. Une seule requête de 14 jours alimente semaine
// courante ET précédente — deux requêtes séparées liraient deux instants différents.
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  ArrowRight,
  Wallet,
  Package,
  History,
  BarChart3,
  Plus,
  CircleAlert,
  TriangleAlert,
  Info as InfoIcon,
  type LucideIcon,
} from "lucide-react";
import { Bar, BarChart, XAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  listProducts,
  listSalesToday,
  getSaleItemsForSales,
  listSales,
  listOpenTables,
  listActiveRentals,
  listRentals,
} from "@/lib/db";
import { computePeriodStats, computeRentalStats, lastDaysRange } from "@/lib/analytics";
import { buildAlerts, type AppAlert } from "@/lib/alerts";
import { SaleItemChips } from "@/components/SaleItemChips";
import { formatFCFA, formatPercent, formatDayShort, formatRelative } from "@/lib/format";
import { usePreferences } from "@/hooks/use-preferences";
import { useClusterFeatures } from "@/hooks/use-cluster-features";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Accueil — ELYNDRA CAISSE" }],
  }),
  component: DashboardPage,
});

function AnimatedCounter({ value, format }: { value: number; format: (n: number) => string }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayed(0);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayed(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{format(displayed)}</>;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  format,
  delay,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  format: (n: number) => string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className={accent ? "border-primary/30 bg-primary/5" : ""}>
        <CardContent className="p-4 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {/* `truncate` obligatoire : formatFCFA produit des montants à espaces
                insécables — sans plafond, un gros CA pousse la carte KPI hors
                de sa demi-colonne (320–375px, grille `grid-cols-2`). */}
            <p className="truncate text-base font-bold leading-tight sm:text-lg">
              <AnimatedCounter value={value} format={format} />
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const SEVERITY_ICON: Record<AppAlert["severity"], LucideIcon> = {
  danger: CircleAlert,
  warning: TriangleAlert,
  info: InfoIcon,
};

const SEVERITY_CLASS: Record<AppAlert["severity"], string> = {
  danger: "text-destructive",
  warning: "text-amber-500",
  info: "text-sky-500",
};

function AlertsSection({ alerts }: { alerts: AppAlert[] }) {
  const [expanded, setExpanded] = useState(false);
  if (alerts.length === 0) return null;
  const visible = expanded ? alerts : alerts.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
    >
      <Card>
        <div className="border-b px-4 py-3">
          <p className="text-base font-semibold">Nouvelles alertes</p>
          <p className="text-xs text-muted-foreground">Ce qui attend une action de votre part.</p>
        </div>
        <div className="space-y-1.5 p-4">
          {visible.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity];
            return (
              <Link
                key={alert.id}
                to={alert.to}
                className="flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <span className={`mt-0.5 shrink-0 ${SEVERITY_CLASS[alert.severity]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{alert.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {alert.detail}
                  </span>
                </span>
              </Link>
            );
          })}
          {alerts.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Réduire" : `Tout voir (${alerts.length})`}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

const weekChartConfig = {
  revenue: { label: "Chiffre d'affaires", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Durée moyenne affichée : 1 chiffre après la virgule, sans décimales inutiles. */
function roundDuration(d: number): string {
  if (d >= 10) return Math.round(d).toString();
  return d.toFixed(1).replace(".", ",");
}

function DashboardPage() {
  const { workspaceName } = usePreferences();
  const features = useClusterFeatures();
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
  });

  const { data: fortnightData } = useQuery({
    queryKey: ["sales", "range", fortnightRange.from, fortnightRange.to],
    queryFn: async () => {
      const sales = await listSales(fortnightRange.from, fortnightRange.to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
  });

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const { data: openTables } = useQuery({
    queryKey: ["open_tables"],
    queryFn: listOpenTables,
    staleTime: 30_000,
  });
  const { data: activeRentals } = useQuery({
    queryKey: ["rentals", "active"],
    queryFn: listActiveRentals,
    staleTime: 30_000,
  });
  // Locations COMMENCÉES dans les 14 derniers jours : c'est le « revenu par actif » du
  // cluster location, absent du canal des ventes (une location n'est jamais une vente).
  const { data: fortnightRentals } = useQuery({
    queryKey: ["rentals", "range", fortnightRange.from, fortnightRange.to],
    queryFn: () => listRentals(fortnightRange.from, fortnightRange.to),
  });

  const rentalStats = useMemo(
    () =>
      fortnightRentals && fortnightRentals.length > 0
        ? computeRentalStats(fortnightRentals, fortnightRange.from, fortnightRange.to)
        : null,
    [fortnightRentals, fortnightRange],
  );

  const todayStats = useMemo(() => {
    if (!todayData) return null;
    return computePeriodStats(todayData.sales, todayData.items, todayRange.from, todayRange.to);
  }, [todayData, todayRange]);

  const { weekStats, prevStats } = useMemo(() => {
    if (!fortnightData) return { weekStats: null, prevStats: null };
    return {
      weekStats: computePeriodStats(
        fortnightData.sales,
        fortnightData.items,
        weekRange.from,
        weekRange.to,
      ),
      prevStats: computePeriodStats(
        fortnightData.sales,
        fortnightData.items,
        fortnightRange.from,
        weekRange.from,
      ),
    };
  }, [fortnightData, weekRange, fortnightRange]);

  const alerts = useMemo(
    () => buildAlerts(products ?? [], openTables ?? [], activeRentals),
    [products, openTables, activeRentals],
  );

  // Pas de base de comparaison (semaine précédente vide) → NaN → « — » affiché,
  // plutôt qu'un « +100 % » mensonger sur une reprise d'activité.
  const revenueDelta =
    prevStats && prevStats.revenue > 0 && weekStats
      ? (weekStats.revenue - prevStats.revenue) / prevStats.revenue
      : Number.NaN;

  const recentSales = useMemo(() => {
    if (!fortnightData) return [];
    const itemsBySale = new Map<string, { name: string; quantity: number }[]>();
    for (const item of fortnightData.items) {
      const lines = itemsBySale.get(item.sale_id);
      if (lines) lines.push({ name: item.name, quantity: item.quantity });
      else itemsBySale.set(item.sale_id, [{ name: item.name, quantity: item.quantity }]);
    }
    return [...fortnightData.sales]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
      .map((sale) => ({
        id: sale.id,
        timestamp: sale.timestamp,
        total: sale.total ?? 0,
        items: itemsBySale.get(sale.id) ?? [],
      }));
  }, [fortnightData]);

  type QuickAction = {
    label: string;
    icon: LucideIcon;
    to: "/pos" | "/stocks" | "/history" | "/reports";
  };
  const quickActions: QuickAction[] = [
    { label: "Nouvelle vente", icon: ShoppingCart, to: "/pos" },
    features.isService
      ? { label: "Nouvelle prestation", icon: Plus, to: "/stocks" }
      : { label: "Nouveau produit", icon: Plus, to: "/stocks" },
    { label: "Historique", icon: History, to: "/history" },
    { label: "Rapports", icon: BarChart3, to: "/reports" },
  ];

  const catalogueEmpty = (products?.length ?? 0) === 0;
  const topProducts = weekStats?.topProducts.slice(0, 3) ?? [];
  const weekChartData =
    weekStats?.days.map((d) => ({
      day: formatDayShort(d.day),
      revenue: Math.max(0, Math.round(d.revenue)),
    })) ?? [];

  return (
    <div className="app-container space-y-6 py-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-page-title font-bold">
          Bonjour{workspaceName ? `, ${workspaceName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité</p>
      </motion.div>

      {catalogueEmpty && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">
                  {features.isService
                    ? "Créez votre première prestation"
                    : "Créez votre premier produit"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez vos articles au catalogue pour commencer à encaisser.
                </p>
              </div>
              <Button asChild>
                <Link to="/stocks">
                  Aller aux stocks
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="CA du jour"
          value={todayStats?.revenue ?? 0}
          format={formatFCFA}
          delay={0}
          accent
        />
        <KpiCard
          icon={ShoppingCart}
          label="Ventes"
          value={todayStats?.salesCount ?? 0}
          format={(n) => String(n)}
          delay={0.1}
        />
        <KpiCard
          icon={Users}
          label="Clients servis"
          value={todayStats?.customersCount ?? 0}
          format={(n) => String(n)}
          delay={0.2}
        />
        <KpiCard
          icon={TrendingUp}
          label="Panier moyen"
          value={todayStats?.averageBasket ?? 0}
          format={formatFCFA}
          delay={0.3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {quickActions.map(({ label, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card px-3 py-4 text-center transition-colors hover:bg-accent"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="text-xs font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </motion.div>

      <AlertsSection alerts={alerts} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
      >
        <Card>
          <div className="border-b px-4 py-3">
            <p className="text-base font-semibold">Performance de la semaine</p>
            <p className="text-xs text-muted-foreground">Comparée à la semaine précédente</p>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold leading-tight">
                  {weekStats ? (
                    <AnimatedCounter value={weekStats.revenue} format={formatFCFA} />
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              {Number.isFinite(revenueDelta) && weekStats && weekStats.revenue > 0 && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
                    revenueDelta >= 0
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {revenueDelta >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {formatPercent(revenueDelta, true)}
                </span>
              )}
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">
                Ventes&nbsp;
                <span className="font-semibold text-foreground">{weekStats?.salesCount ?? 0}</span>
              </span>
              <span className="text-muted-foreground">
                Panier moyen&nbsp;
                <span className="font-semibold text-foreground">
                  {formatFCFA(weekStats?.averageBasket ?? 0)}
                </span>
              </span>
            </div>
            <ChartContainer config={weekChartConfig} className="h-20 w-full">
              <BarChart data={weekChartData} margin={{ left: 0, right: 0 }}>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  fontSize={11}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => formatFCFA(Number(v))} />}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={3} />
              </BarChart>
            </ChartContainer>
          </div>
        </Card>
      </motion.div>

      {topProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.55 }}
        >
          <Card>
            <div className="border-b px-4 py-3">
              <p className="text-base font-semibold">
                Top {features.isService ? "prestations" : "produits"} — 7 jours
              </p>
            </div>
            <div className="space-y-1 p-2">
              {topProducts.map((product, index) => (
                <div
                  key={`${product.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {product.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {product.quantity} {features.isService ? "prestations" : "ventes"}
                  </span>
                  <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatFCFA(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {features.isLocation && rentalStats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.55 }}
        >
          <Card>
            <div className="border-b px-4 py-3">
              <p className="text-base font-semibold">Location — 14 jours</p>
            </div>
            <div className="grid grid-cols-3 gap-3 border-b p-4">
              <div>
                <p className="text-xs text-muted-foreground">Revenu locations</p>
                <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                  {formatFCFA(rentalStats.revenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Locations</p>
                <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                  {rentalStats.rentalsCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Durée moyenne</p>
                <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                  {roundDuration(rentalStats.avgDuration)}{" "}
                  {rentalStats.avgDurationUnit === "heure" ? "h" : "j"}
                </p>
              </div>
            </div>
            {rentalStats.byAsset.length > 0 && (
              <div className="space-y-1 p-2">
                {rentalStats.byAsset.slice(0, 3).map((asset, index) => (
                  <div
                    key={asset.asset_id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {asset.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {asset.rentalsCount} location{asset.rentalsCount > 1 ? "s" : ""}
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                      {formatFCFA(asset.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {recentSales.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.65 }}
        >
          <Card>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-base font-semibold">Activité récente</p>
              <span className="text-xs text-muted-foreground">
                {recentSales.length} vente{recentSales.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-0.5 p-2">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <SaleItemChips items={sale.items} className="min-w-0" />
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelative(sale.timestamp)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatFCFA(sale.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t p-2">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/history">
                  Voir tout l'historique
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
