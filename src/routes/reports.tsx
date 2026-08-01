import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarDays, Download, FileSpreadsheet, FileText, Lock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";
import { closeDay, startOfToday } from "@/lib/db";
import { computePeriodStats, lastDaysRange } from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDay, formatDayShort, formatFCFA, formatPercent } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { describeSaveResult, getDocumentsDirectoryName, saveDocument } from "@/lib/files";
import { buildCsvBlob } from "@/lib/exports/csv";
import { buildPdfBlob, captureChartPng, pdfFilename } from "@/lib/exports/pdf";
import { buildXlsxBlob, xlsxFilename } from "@/lib/exports/xlsx";
import { reportFilename, type ReportPayload } from "@/lib/exports/report";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Rapports & clôture — Caisse POS" },
      {
        name: "description",
        content:
          "Analyse des ventes par période, revenus contre bénéfices, exports CSV, Excel et PDF.",
      },
    ],
  }),
  component: ReportsPage,
});

// « today » est le préréglage par défaut : il porte les KPI du jour, seule chose que
// l'ancienne route /dashboard apportait en propre. Cette page l'a absorbée, le reste
// (courbe, faits saillants, exports) était déjà ici en plus complet.
type PresetKey = "today" | "7" | "30" | "custom";

const chartConfig = {
  revenue: { label: "Revenus", color: "var(--chart-1)" },
  profit: { label: "Bénéfices", color: "var(--chart-2)" },
  expenses: { label: "Dépenses", color: "var(--chart-5)" },
} satisfies ChartConfig;

function ReportsPage() {
  const qc = useQueryClient();
  const { workspaceName } = usePreferences();
  const [preset, setPreset] = useState<PresetKey>("today");
  const [range, setRange] = useState<DateRange | undefined>();
  const chartRef = useRef<HTMLDivElement>(null);

  // La plage personnalisée n'est prise en compte qu'une fois les deux bornes choisies ;
  // entre les deux clics du calendrier, on reste sur les 7 jours pour ne pas afficher
  // une période d'un seul jour au passage.
  const { from, to, label } = useMemo(() => {
    if (preset === "custom" && range?.from && range?.to) {
      const start = new Date(range.from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(range.to);
      end.setHours(0, 0, 0, 0);
      return {
        from: start.getTime(),
        to: end.getTime() + 86400000,
        label: `${formatDayShort(start.getTime())} – ${formatDayShort(end.getTime())}`,
      };
    }
    if (preset === "today") return { ...lastDaysRange(1), label: "Aujourd'hui" };
    const days = preset === "30" ? 30 : 7;
    return { ...lastDaysRange(days), label: `${days} derniers jours` };
  }, [preset, range]);

  const { data } = usePeriodData(from, to);
  const sales = useMemo(() => data?.sales ?? [], [data]);
  const items = useMemo(() => data?.items ?? [], [data]);
  const expenses = useMemo(() => data?.expenses ?? [], [data]);

  const stats = useMemo(
    () => computePeriodStats(sales, items, from, to, expenses),
    [sales, items, from, to, expenses],
  );

  const payload: ReportPayload = {
    label,
    from,
    to,
    stats,
    sales,
    items,
    expenses,
    workspaceName,
  };

  const chartData = stats.days.map((d) => ({
    day: formatDayShort(d.day),
    revenue: d.revenue,
    profit: d.profit,
    expenses: d.expenses,
  }));

  const closeMut = useMutation({
    mutationFn: closeDay,
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success(`${n} vente(s) clôturée(s)`);
    },
  });

  const salesToday = sales.filter(
    (s) => s.timestamp >= startOfToday() && s.timestamp < startOfToday() + 86400000,
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Rapports & clôture
        </h1>
        <p className="text-sm text-muted-foreground">Analyse des ventes sur la période choisie.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
          <TabsList>
            <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="7">7 jours</TabsTrigger>
            <TabsTrigger value="30">30 jours</TabsTrigger>
            <TabsTrigger value="custom">Personnalisé</TabsTrigger>
          </TabsList>
        </Tabs>
        {preset === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarDays className="h-4 w-4 mr-2" />
                {range?.from && range?.to ? label : "Choisir les dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} />
            </PopoverContent>
          </Popover>
        )}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Revenus" value={formatFCFA(stats.revenue)} highlight />
        <StatCard
          label="Bénéfices"
          value={formatFCFA(stats.netProfit)}
          hint="net, dépenses déduites"
          highlight
        />
        <StatCard label="Dépenses" value={formatFCFA(stats.expenses)} />
        <StatCard label="Ventes" value={String(stats.salesCount)} />
        <StatCard label="Clients" value={String(stats.customersCount)} />
        <StatCard
          label="Marge"
          value={formatPercent(stats.netMarginRate)}
          hint="bénéfice net ÷ revenus"
        />
        <StatCard label="Panier moyen" value={formatFCFA(stats.averageBasket)} />
        <StatCard label="Articles vendus" value={String(stats.itemsCount)} />
        <StatCard
          label="Croissance"
          value={formatPercent(stats.growthRate, true)}
          hint="2ᵉ moitié vs 1re moitié"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenus et bénéfices par jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={chartRef}>
            <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
              <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis width={56} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => formatFCFA(Number(v))} />}
                />
                <Legend />
                <Line
                  dataKey="revenue"
                  name="Revenus"
                  type="monotone"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="profit"
                  name="Bénéfices"
                  type="monotone"
                  stroke="var(--color-profit)"
                  strokeWidth={2}
                  dot={false}
                />
                {/* Pointillés : les dépenses sont une série de nature différente des
                    deux autres, la ligner pleine les mettrait sur le même plan. */}
                <Line
                  dataKey="expenses"
                  name="Dépenses"
                  type="monotone"
                  stroke="var(--color-expenses)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Faits saillants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Highlight
              label="Meilleur jour de vente"
              value={
                stats.bestDay
                  ? `${formatDay(stats.bestDay.day)} — ${formatFCFA(stats.bestDay.revenue)}`
                  : "aucune vente sur la période"
              }
            />
            <Highlight
              label="Jour le moins rentable"
              value={
                stats.worstDay
                  ? `${formatDay(stats.worstDay.day)} — ${formatFCFA(stats.worstDay.netProfit)} net`
                  : "aucune activité sur la période"
              }
            />
            <Highlight label="Marge brute moyenne" value={formatPercent(stats.marginRate)} />
            <Highlight label="Marge nette moyenne" value={formatPercent(stats.netMarginRate)} />
            <Highlight label="Taux de croissance" value={formatPercent(stats.growthRate, true)} />
            <Highlight label="Bénéfice brut" value={formatFCFA(stats.profit)} />
            <Highlight label="Dépenses" value={formatFCFA(stats.expenses)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenus par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p>
            ) : (
              <>
                <ChartContainer
                  config={{ revenue: { label: "Revenus", color: "var(--chart-1)" } }}
                  className="aspect-[2/1] w-full"
                >
                  <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={80}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(v) => formatFCFA(Number(v))} />}
                    />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                  </BarChart>
                </ChartContainer>
                {/* Le tableau chiffré double le graphique à dessein : sur un écran de
                    téléphone les barres seules ne se lisent pas. */}
                <div className="mt-3 space-y-1 text-sm">
                  {stats.byCategory.map((c) => (
                    <div key={c.category} className="flex justify-between gap-2">
                      <span>{c.category}</span>
                      <span className="text-muted-foreground">
                        {formatFCFA(c.revenue)} ·{" "}
                        {formatPercent(stats.revenue > 0 ? c.revenue / stats.revenue : 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ExportCard payload={payload} chartRef={chartRef} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clôture</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                confirm("Clôturer la journée ? Les ventes ne pourront plus être annulées sans PIN.")
              ) {
                closeMut.mutate();
              }
            }}
            disabled={salesToday === 0}
          >
            <Lock className="h-4 w-4 mr-2" /> Clôturer la journée
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">{salesToday} vente(s) aujourd'hui.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function ExportCard({
  payload,
  chartRef,
}: {
  payload: ReportPayload;
  chartRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const { data: directory } = useQuery({
    queryKey: ["settings", "documents_dir"],
    queryFn: getDocumentsDirectoryName,
  });

  async function run(kind: string, make: () => Promise<{ blob: Blob; filename: string }>) {
    setBusy(kind);
    try {
      const { blob, filename } = await make();
      const result = await saveDocument(blob, filename);
      toast.success(describeSaveResult(result, filename));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setBusy(null);
    }
  }

  const empty = payload.stats.salesCount === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={empty || busy !== null}
            onClick={() =>
              run("csv", async () => ({
                blob: buildCsvBlob(payload),
                filename: reportFilename(payload, "csv"),
              }))
            }
          >
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button
            variant="outline"
            disabled={empty || busy !== null}
            onClick={() =>
              run("xlsx", async () => ({
                blob: await buildXlsxBlob(payload),
                filename: xlsxFilename(payload),
              }))
            }
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button
            variant="outline"
            disabled={empty || busy !== null}
            onClick={() =>
              run("pdf", async () => ({
                blob: buildPdfBlob(payload, await captureChartPng(chartRef.current)),
                filename: pdfFilename(payload),
              }))
            }
          >
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {directory ? (
            <>Destination : « {directory} ». </>
          ) : (
            <>Sans dossier choisi, les fichiers vont dans Téléchargements. </>
          )}
          Le dossier et la sauvegarde complète de la base sont dans{" "}
          <Link to="/settings" className="text-primary underline">
            Paramètres
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
