// Page d'accueil — Vue d'ensemble du jour.
// KPIs animés (compteur de 0 → valeur finale, apparition décalée des cartes),
// état vide avec bouton vers la caisse.
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { TrendingUp, ShoppingCart, Users, BarChart3, ArrowRight, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listProducts, listSalesToday, getSaleItemsForSales } from "@/lib/db";
import { computePeriodStats, lastDaysRange } from "@/lib/analytics";
import { formatFCFA } from "@/lib/format";
import { usePreferences } from "@/hooks/use-preferences";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
            <p className="text-lg font-bold leading-tight">
              <AnimatedCounter value={value} format={format} />
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardPage() {
  const { workspaceName } = usePreferences();
  const todayRange = useMemo(() => lastDaysRange(1), []);
  const weekRange = useMemo(() => lastDaysRange(7), []);

  const { data: todayData } = useQuery({
    queryKey: ["sales", "range", todayRange.from, todayRange.to],
    queryFn: async () => {
      const sales = await listSalesToday();
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
  });

  const { data: weekData } = useQuery({
    queryKey: ["sales", "range", weekRange.from, weekRange.to],
    queryFn: async () => {
      const { listSales, getSaleItemsForSales } = await import("@/lib/db");
      const sales = await listSales(weekRange.from, weekRange.to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
  });

  const todayStats = useMemo(() => {
    if (!todayData) return null;
    return computePeriodStats(todayData.sales, todayData.items, todayRange.from, todayRange.to);
  }, [todayData, todayRange]);

  const weekStats = useMemo(() => {
    if (!weekData) return null;
    return computePeriodStats(weekData.sales, weekData.items, weekRange.from, weekRange.to);
  }, [weekData, weekRange]);

  const hasSales = (todayStats?.salesCount ?? 0) > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">Bonjour{workspaceName ? `, ${workspaceName}` : ""}</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité</p>
      </motion.div>

      {!hasSales ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ShoppingCart className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">Aucune vente aujourd'hui</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Commencez à encaisser pour voir vos statistiques apparaître ici.
                </p>
              </div>
              <Button asChild>
                <Link to="/pos">
                  Aller à la caisse
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
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

          {weekStats && weekStats.salesCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.45 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Cette semaine</p>
                    <p className="font-semibold">
                      <AnimatedCounter value={weekStats.revenue} format={formatFCFA} />
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">7 jours</p>
                    <p className="font-semibold">{weekStats.salesCount} ventes</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
