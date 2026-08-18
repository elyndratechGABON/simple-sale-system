import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";
import { closeDay, getProductExpenses, listSalesToday, saveProductExpense } from "@/lib/db";
import { computePeriodStats, lastDaysRange, type ProductBucket } from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDay, formatDayShort, formatFCFA, formatPercent } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { describeSaveResult, getDocumentsDirectoryName, saveDocument } from "@/lib/files";
import { CloseDayDialog } from "@/components/CloseDayDialog";
import { buildCsvBlob } from "@/lib/exports/csv";
import { buildPdfBlob, captureChartPng, pdfFilename } from "@/lib/exports/pdf";
import { buildXlsxBlob, xlsxFilename } from "@/lib/exports/xlsx";
import { reportFilename, type ReportPayload } from "@/lib/exports/report";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Rapports & clôture — ELYNDRA CAISSE" },
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
} satisfies ChartConfig;

/**
 * Carte de saisie des coûts d'acquisition par produit. Le coût est saisi une fois par
 * produit pour toute la période ; il est persisté dans IndexedDB (table product_expenses)
 * et recalculé dès que l'utilisateur quitte le champ.
 */
function ExpenseInputCard({
  products,
  from,
  to,
  productExpenses,
}: {
  products: ProductBucket[];
  from: number;
  to: number;
  productExpenses: { product_id: string; cost: number }[];
}) {
  const qc = useQueryClient();
  const [localCosts, setLocalCosts] = useState<Record<string, string>>({});

  const costsByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of productExpenses) map.set(e.product_id, e.cost);
    return map;
  }, [productExpenses]);

  const saveMut = useMutation({
    mutationFn: async ({ productId, cost }: { productId: string; cost: number }) => {
      await saveProductExpense(productId, from, to, cost);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-expenses", from, to] });
    },
  });

  const handleChange = useCallback((productId: string, value: string) => {
    setLocalCosts((prev) => ({ ...prev, [productId]: value }));
  }, []);

  const handleBlur = useCallback(
    (productId: string) => {
      setLocalCosts((prev) => {
        const raw = prev[productId];
        if (raw === undefined) return prev;
        const num = Number(raw.replace(/\D/g, "")) || 0;
        saveMut.mutate({ productId, cost: num });
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    [saveMut],
  );

  if (products.length === 0) return null;

  let totalRevenue = 0;
  let totalCost = 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Coûts d'acquisition</CardTitle>
        <p className="text-xs text-muted-foreground">
          Saisissez ce que vous avez payé pour chaque produit. Le bénéfice se calcule
          automatiquement.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">Revenus</TableHead>
              <TableHead className="text-right w-32">Coût acq.</TableHead>
              <TableHead className="text-right">Bénéfice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const cost = costsByProduct.get(p.name) ?? 0;
              const displayCost =
                localCosts[p.name] !== undefined
                  ? localCosts[p.name]
                  : cost > 0
                    ? String(cost)
                    : "";
              const profit = p.revenue - cost;
              totalRevenue += p.revenue;
              totalCost += cost;
              return (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">
                    {p.name}
                    <span className="ml-2 text-xs text-muted-foreground">{p.category}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatFCFA(p.revenue)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      inputMode="numeric"
                      value={displayCost}
                      onChange={(e) => handleChange(p.name, e.target.value.replace(/\D/g, ""))}
                      onBlur={() => handleBlur(p.name)}
                      placeholder="0"
                      className="h-8 w-28 text-right tabular-nums ml-auto"
                    />
                  </TableCell>
                  <TableCell
                    className={
                      "text-right tabular-nums font-medium " +
                      (profit >= 0 ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {formatFCFA(profit)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="mt-3 flex justify-end gap-6 text-sm font-medium border-t pt-3">
          <span>Revenus : {formatFCFA(totalRevenue)}</span>
          <span>Coûts : {formatFCFA(totalCost)}</span>
          <span className={totalRevenue - totalCost >= 0 ? "text-emerald-600" : "text-red-600"}>
            Bénéfice : {formatFCFA(totalRevenue - totalCost)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsPage() {
  const qc = useQueryClient();
  const { workspaceName } = usePreferences();
  const [preset, setPreset] = useState<PresetKey>("today");
  const [showDetail, setShowDetail] = useState(false);
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

  const { data: productExpenses = [] } = useQuery({
    queryKey: ["product-expenses", from, to],
    queryFn: () => getProductExpenses(from, to),
  });

  const stats = useMemo(
    () => computePeriodStats(sales, items, from, to, productExpenses),
    [sales, items, from, to, productExpenses],
  );

  // Période de même durée juste avant : pour « Aujourd'hui » c'est hier, pour « 7 jours »
  // les 7 jours d'avant, pour une plage personnalisée la même longueur.
  const prevRange = useMemo(() => {
    const length = to - from;
    return { from: from - length, to: from };
  }, [from, to]);
  const prev = usePeriodData(prevRange.from, prevRange.to);
  const { data: prevExpenses = [] } = useQuery({
    queryKey: ["product-expenses", prevRange.from, prevRange.to],
    queryFn: () => getProductExpenses(prevRange.from, prevRange.to),
  });
  const prevStats = useMemo(
    () =>
      computePeriodStats(
        prev.data?.sales ?? [],
        prev.data?.items ?? [],
        prevRange.from,
        prevRange.to,
        prevExpenses,
      ),
    [prev.data, prevRange.from, prevRange.to, prevExpenses],
  );

  const topProducts = stats.topProducts.slice(0, 10);
  const topRest = stats.topProducts.length - topProducts.length;

  const payload: ReportPayload = {
    label,
    from,
    to,
    stats,
    sales,
    items,
    workspaceName,
  };

  const chartData = stats.days.map((d) => ({
    day: formatDayShort(d.day),
    revenue: d.revenue,
    profit: d.profit,
  }));

  const closeMut = useMutation({
    mutationFn: closeDay,
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success(`${n} vente(s) clôturée(s)`);
    },
  });

  // Les ventes du jour en propre, indépendamment de la période affichée : la clôture
  // verrouille AUJOURD'HUI, même si le rapport montre les 30 derniers jours ou une
  // plage personnalisée du passé.
  const { data: salesToday = [] } = useQuery({
    queryKey: ["sales", "today"],
    queryFn: listSalesToday,
  });
  const todayTotal = salesToday.reduce((s, x) => s + x.total, 0);

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

      {/* Vue simplifiée : KPI + top articles + clôture */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Revenus" value={formatFCFA(stats.revenue)} highlight large />
        <StatCard label="Bénéfices" value={formatFCFA(stats.profit)} highlight large />
        <StatCard label="Ventes" value={String(stats.salesCount)} large />
        <StatCard label="Panier moyen" value={formatFCFA(stats.averageBasket)} />
        <StatCard label="Articles vendus" value={String(stats.itemsCount)} />
        <StatCard label="Clients" value={String(stats.customersCount)} />
      </div>

      <TopArticlesCard
        products={topProducts.slice(0, 5)}
        rest={Math.max(0, topProducts.length - 5)}
      />

      <ExpenseInputCard
        products={topProducts}
        from={from}
        to={to}
        productExpenses={productExpenses}
      />

      <Button variant="outline" className="w-full" onClick={() => setShowDetail((d) => !d)}>
        {showDetail ? (
          <ChevronUp className="h-4 w-4 mr-2" />
        ) : (
          <ChevronDown className="h-4 w-4 mr-2" />
        )}
        {showDetail ? "Masquer le rapport détaillé" : "Voir le rapport complet"}
      </Button>

      {/* Vue détaillée : graphique, comparaison, exports */}
      {showDetail && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Comparaison avec la période précédente
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                du {formatDayShort(prevRange.from)} au {formatDayShort(prevRange.to - 1)} — même
                durée que la période affichée
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ComparisonCell
                  label="Revenus"
                  value={stats.revenue}
                  previous={prevStats.revenue}
                  isMoney
                />
                <ComparisonCell
                  label="Bénéfices"
                  value={stats.profit}
                  previous={prevStats.profit}
                  isMoney
                />
                <ComparisonCell
                  label="Ventes"
                  value={stats.salesCount}
                  previous={prevStats.salesCount}
                />
                <ComparisonCell
                  label="Panier moyen"
                  value={stats.averageBasket}
                  previous={prevStats.averageBasket}
                  isMoney
                />
                <ComparisonCell
                  label="Articles vendus"
                  value={stats.itemsCount}
                  previous={prevStats.itemsCount}
                />
              </div>
              <div className="border-t pt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Meilleur jour de vente</span>
                  <span className="font-medium text-right">
                    {stats.bestDay
                      ? `${formatDay(stats.bestDay.day)} — ${formatFCFA(stats.bestDay.revenue)}`
                      : "aucune vente sur la période"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Jour le moins rentable</span>
                  <span className="font-medium text-right">
                    {stats.worstDay
                      ? `${formatDay(stats.worstDay.day)} — ${formatFCFA(stats.worstDay.profit)}`
                      : "aucune activité sur la période"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  </LineChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <TopArticlesCard products={topProducts} rest={topRest} />

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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Par table</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byTable.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead className="text-right">Tournées</TableHead>
                      <TableHead className="text-right">Ventes</TableHead>
                      <TableHead className="text-right">Clients</TableHead>
                      <TableHead className="text-right">Revenus</TableHead>
                      <TableHead className="text-right">Bénéfice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.byTable.map((t) => (
                      <TableRow key={t.label}>
                        <TableCell className="font-medium">{t.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.rounds}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.salesCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.clients}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatFCFA(t.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-primary">
                          {formatFCFA(t.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <ExportCard payload={payload} chartRef={chartRef} />
        </>
      )}

      <CloseCard
        salesCount={salesToday.length}
        total={todayTotal}
        busy={closeMut.isPending}
        onClose={() => closeMut.mutate()}
      />
    </div>
  );
}

function ComparisonCell({
  label,
  value,
  previous,
  isMoney,
}: {
  label: string;
  value: number;
  previous: number;
  isMoney?: boolean;
}) {
  // Sans base (période précédente sans activité) la variation n'a pas de sens : « +0 % »
  // ferait croire à une stagnation alors que l'activité est partie de zéro.
  const diff = previous === 0 ? null : (value - previous) / previous;
  const shown = isMoney ? formatFCFA(value) : String(value);
  const prev = isMoney ? formatFCFA(previous) : String(previous);
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{shown}</div>
      <div className="mt-1 text-xs tabular-nums">
        {diff === null ? (
          <span className="text-muted-foreground">préc. {prev} — pas de base</span>
        ) : diff === 0 ? (
          <span className="text-muted-foreground">= {prev}</span>
        ) : (
          <span className={diff > 0 ? "text-emerald-600" : "text-red-600"}>
            {formatPercent(diff, true)}{" "}
            <span className="text-muted-foreground">· préc. {prev}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function TopArticlesCard({ products, rest }: { products: ProductBucket[]; rest: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top articles</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Revenus</TableHead>
                  <TableHead className="text-right">Bénéfice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p, index) => (
                  <TableRow key={p.name}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {p.name}
                      <span className="ml-2 text-xs text-muted-foreground">{p.category}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatFCFA(p.revenue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-primary">
                      {formatFCFA(p.profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rest > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                + {rest} autre(s) produit(s) non affiché(s).
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CloseCard({
  salesCount,
  total,
  busy,
  onClose,
}: {
  salesCount: number;
  total: number;
  busy: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clôture</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          disabled={salesCount === 0 || busy}
        >
          <Lock className="h-4 w-4 mr-2" /> Clôturer la journée
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          {salesCount} vente{salesCount > 1 ? "s" : ""} aujourd'hui.
        </p>
        <CloseDayDialog
          open={open}
          onOpenChange={setOpen}
          salesCount={salesCount}
          total={total}
          busy={busy}
          onConfirm={() => {
            setOpen(false);
            onClose();
          }}
        />
      </CardContent>
    </Card>
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
