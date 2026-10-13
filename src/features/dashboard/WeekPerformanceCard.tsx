import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Bar, BarChart, XAxis } from "recharts";
import { Card } from "@/components/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatFCFA, formatPercent } from "@/lib/format";
import { AnimatedCounter } from "./AnimatedCounter";
import type { DashboardData } from "./useDashboardData";

const weekChartConfig = {
  revenue: { label: "Chiffre d'affaires", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function WeekPerformanceCard({ data }: { data: DashboardData }) {
  const { weekStats, weekChartData, revenueDelta } = data;

  return (
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
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
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
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={4} fontSize={11} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => formatFCFA(Number(v))} />}
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={3} />
            </BarChart>
          </ChartContainer>
        </div>
      </Card>
    </motion.div>
  );
}
