import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  Lock,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import {
  closeDay,
  getProductExpenses,
  listDayClosures,
  listSalesToday,
  saveProductExpense,
  type PaymentMethod,
} from "@/lib/db";
import {
  computeDayDetail,
  computePeriodStats,
  lastDaysRange,
  type ProductBucket,
} from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { usePreferences } from "@/hooks/use-preferences";
import {
  formatDay,
  formatDayShort,
  formatFCFA,
  formatFCFACompact,
  formatPercent,
  formatTime,
} from "@/lib/format";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// Granularité de la courbe : par jour, regroupée par semaine (lundi) ou par mois.
type Granularity = "day" | "week" | "month";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "Carte",
  mobile_money: "Mobile Money",
};

/** Clé et libellé du bucket temporel d'un jour, selon la granularité choisie. */
function bucketOf(ts: number, g: Granularity): { key: string; label: string } {
  if (g === "day") return { key: String(ts), label: formatDayShort(ts) };
  const d = new Date(ts);
  if (g === "week") {
    // Semaine commençant le lundi : on ramène au lundi de la semaine du jour.
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { key: `w${monday.getTime()}`, label: formatDayShort(monday.getTime()) };
  }
  return {
    key: `m${d.getFullYear()}-${d.getMonth()}`,
    label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
  };
}

/** Minuit du lundi de la semaine (lundi) qui contient `ts`. */
function startOfWeekMonday(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Vue du calendrier des ventes : grille du mois, bande de la semaine, ou jour seul. */
type CalendarView = "month" | "week" | "day";

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
              // Clé `product_id` — les coûts sont indexés par cet identifiant, PAS par le
              // nom (deux produits homonymes ne partagent pas leur coût d'acquisition).
              const cost = costsByProduct.get(p.product_id) ?? 0;
              const displayCost =
                localCosts[p.product_id] !== undefined
                  ? localCosts[p.product_id]
                  : cost > 0
                    ? String(cost)
                    : "";
              const profit = p.revenue - cost;
              totalRevenue += p.revenue;
              totalCost += cost;
              return (
                <TableRow key={p.product_id}>
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
                      onChange={(e) =>
                        handleChange(p.product_id, e.target.value.replace(/\D/g, ""))
                      }
                      onBlur={() => handleBlur(p.product_id)}
                      placeholder="0"
                      className="ml-auto h-10 w-24 text-right tabular-nums xs:w-28"
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
        {/* `flex-wrap` : trois totaux côte à côte font ~500px — sans retour à la
            ligne ils poussent la page en scroll horizontal sous 480px. */}
        <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm font-medium border-t pt-3">
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
  const [granularity, setGranularity] = useState<Granularity>("day");
  // Calendrier des ventes : vue (mois/semaine/jour), jour en focus, jour ouvert en détail.
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [focusedDay, setFocusedDay] = useState<number>(() => startOfDay(Date.now()).getTime());
  const [detailDay, setDetailDay] = useState<number | null>(null);
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

  // Courbe agrégée selon la granularité choisie. Par jour : la série complète telle
  // quelle. Semaine/mois : sommes des jours, dans l'ordre chronologique de la série.
  const chartBuckets = useMemo(() => {
    if (granularity === "day") {
      return stats.days.map((d) => ({
        day: formatDayShort(d.day),
        revenue: d.revenue,
        profit: d.profit,
      }));
    }
    const map = new Map<string, { day: string; revenue: number; profit: number }>();
    for (const d of stats.days) {
      const b = bucketOf(d.day, granularity);
      const cur = map.get(b.key) ?? { day: b.label, revenue: 0, profit: 0 };
      cur.revenue += d.revenue;
      cur.profit += d.profit;
      map.set(b.key, cur);
    }
    return Array.from(map.values());
  }, [stats.days, granularity]);

  // Résumé financier : ce qui est entré, ce qui a coûté, ce qu'on a laissé en remise.
  // « Coûts d'acquisition » = revenus − bénéfice (les coûts figés dans les lignes).
  // Les dépenses produit saisies à la main viennent s'ajouter — elles ne sont PAS déjà
  // déduites du bénéfice, cf. computePeriodStats.
  const acquisitionCosts = stats.revenue - stats.profit;
  const productExpensesTotal = useMemo(
    () => productExpenses.reduce((sum, e) => sum + e.cost, 0),
    [productExpenses],
  );
  const totalDiscounts = useMemo(
    () => sales.reduce((sum, s) => sum + (s.discount ?? 0), 0),
    [sales],
  );

  // Répartition par moyen de paiement. Absent sur les ventes antérieures au suivi =
  // espèces, seul mode alors possible.
  const byPayment = useMemo(() => {
    const m = new Map<PaymentMethod, { total: number; count: number }>();
    for (const s of sales) {
      const key: PaymentMethod = s.payment_method ?? "cash";
      const cur = m.get(key) ?? { total: 0, count: 0 };
      cur.total += s.total;
      cur.count += 1;
      m.set(key, cur);
    }
    return Array.from(m.entries())
      .map(([method, v]) => ({
        method,
        ...v,
        share: stats.revenue > 0 ? v.total / stats.revenue : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sales, stats.revenue]);

  // Montant par jour du mois affiché par le calendrier — indépendant de la période
  // choisie, pour que chaque cellule porte son revenu même hors du filtre courant.
  const calendarMonthStart = useMemo(() => startOfMonth(focusedDay).getTime(), [focusedDay]);
  const calendarMonthEnd = useMemo(() => endOfMonth(focusedDay).getTime() + 86400000, [focusedDay]);
  const { data: calendarMonthData } = usePeriodData(calendarMonthStart, calendarMonthEnd);
  const calendarAmounts = useMemo(() => {
    const s = computePeriodStats(
      calendarMonthData?.sales ?? [],
      calendarMonthData?.items ?? [],
      calendarMonthStart,
      calendarMonthEnd,
      [],
    );
    // Zéro vente = pas de pastille : le calendrier ne montre que l'activité réelle.
    return new Map(s.days.filter((d) => d.revenue > 0).map((d) => [d.day, d.revenue]));
  }, [calendarMonthData, calendarMonthStart, calendarMonthEnd]);

  // Les 7 jours (lundi→dimanche) de la semaine qui contient le jour en focus.
  const weekDays = useMemo(() => {
    const monday = startOfWeekMonday(focusedDay);
    return Array.from({ length: 7 }, (_, i) => monday + i * 86400000);
  }, [focusedDay]);

  // Recommandations contextuelles : uniquement des faits calculés, jamais de conseil
  // générique. Le stock bas vit dans la cloche du tableau de bord, on ne le duplique pas.
  const tips = useMemo(() => {
    const out: { tone: "good" | "warn" | "info"; text: string }[] = [];
    if (prevStats.salesCount > 0 && prevStats.revenue > 0) {
      if (stats.revenue >= prevStats.revenue * 1.1) {
        out.push({
          tone: "good",
          text: `Le chiffre d'affaires progresse de ${formatPercent(stats.revenue / prevStats.revenue - 1, true)} par rapport à la période précédente.`,
        });
      } else if (stats.revenue <= prevStats.revenue * 0.9) {
        out.push({
          tone: "warn",
          text: `Le chiffre d'affaires recule de ${formatPercent(1 - stats.revenue / prevStats.revenue, true)} par rapport à la période précédente.`,
        });
      }
    }
    const top = stats.topProducts[0];
    if (top && top.quantity > 0) {
      out.push({
        tone: "info",
        text: `Meilleure vente : ${top.name} — ${top.quantity} vendu(s), ${formatFCFA(top.revenue)}.`,
      });
    }
    if (stats.bestDay) {
      out.push({
        tone: "info",
        text: `Meilleure journée : ${formatDay(stats.bestDay.day)} avec ${formatFCFA(stats.bestDay.revenue)}.`,
      });
    }
    return out;
  }, [stats, prevStats]);

  const payload: ReportPayload = {
    label,
    from,
    to,
    stats,
    sales,
    items,
    workspaceName,
  };

  const closeMut = useMutation({
    mutationFn: closeDay,
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["day_closures"] });
      toast.success(`${n} vente(s) clôturée(s)`);
    },
  });

  // Historique des clôtures enregistrées — la plus récente d'abord. Vide tant qu'aucune
  // clôture n'a été posée depuis l'ajout de la fonctionnalité : on ne reconstruit pas
  // le passé à partir des ventes, la trace figée au moment de la clôture est la source.
  const { data: closures = [] } = useQuery({
    queryKey: ["day_closures"],
    queryFn: () => listDayClosures(5),
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
    <div className="app-container space-y-6 py-6">
      <div>
        <h1 className="text-page-title flex items-center gap-2 font-bold">
          <BarChart3 className="h-6 w-6 shrink-0" /> Rapports & clôture
        </h1>
        <p className="text-sm text-muted-foreground">Analyse des ventes sur la période choisie.</p>
      </div>

      {/* Périodes : les onglets glissent horizontalement sous 480px au lieu
          d'écraser leurs libellés ; l'étiquette de plage reste LUE sous les
          onglets — dans le scrolleur, elle partait hors écran en 320px. */}
      <div>
        <div className="-mx-1 flex max-w-full items-center gap-2 overflow-x-auto px-1 py-1 no-scrollbar">
          <Tabs
            value={preset}
            onValueChange={(v) => setPreset(v as PresetKey)}
            className="shrink-0"
          >
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
                <Button variant="outline" className="shrink-0">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {range?.from && range?.to ? label : "Choisir les dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} />
              </PopoverContent>
            </Popover>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>

      {/* KPI : une colonne sur téléphone (les montants respirent), deux dès
          480px, trois sur desktop — jamais la grille desktop forcée en petit. */}
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Revenus" value={formatFCFA(stats.revenue)} highlight large />
        <StatCard label="Bénéfices" value={formatFCFA(stats.profit)} highlight large />
        <StatCard label="Ventes" value={String(stats.salesCount)} large />
        <StatCard label="Panier moyen" value={formatFCFA(stats.averageBasket)} />
        <StatCard label="Articles vendus" value={String(stats.itemsCount)} />
        <StatCard label="Clients" value={String(stats.customersCount)} />
      </div>

      {/* Résumé financier — toujours visible : c'est la photo que le gérant vient chercher. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Résumé financier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Revenus</span>
              <span className="font-medium tabular-nums">{formatFCFA(stats.revenue)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Coûts d'acquisition</span>
              <span className="font-medium tabular-nums">{formatFCFA(acquisitionCosts)}</span>
            </div>
            {productExpensesTotal > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Dépenses produit saisies</span>
                <span className="font-medium tabular-nums">{formatFCFA(productExpensesTotal)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Bénéfice</span>
              <span className="font-semibold tabular-nums text-primary">
                {formatFCFA(stats.profit)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Marge</span>
              <span className="font-medium tabular-nums">{formatPercent(stats.marginRate)}</span>
            </div>
            {totalDiscounts > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Réductions accordées</span>
                <span className="font-medium tabular-nums">−{formatFCFA(totalDiscounts)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {byPayment.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Modes de paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byPayment.map((p) => (
              <div key={p.method} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{PAYMENT_LABELS[p.method]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatFCFA(p.total)} · {formatPercent(p.share)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.round(p.share * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> À retenir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tips.map((t, i) => (
              <p
                key={i}
                className={
                  t.tone === "good"
                    ? "text-emerald-600"
                    : t.tone === "warn"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                }
              >
                {t.text}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 space-y-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Calendrier des ventes
          </CardTitle>
          {/* Trois vues : la grille du mois (montant sous chaque jour), la bande des
              7 jours de la semaine en cours, ou la journée seule. */}
          <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarView)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="month">Mois</TabsTrigger>
              <TabsTrigger value="week">Semaine</TabsTrigger>
              <TabsTrigger value="day">Jour</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {calendarView === "month" && (
            <Calendar
              locale={fr}
              mode="single"
              selected={new Date(focusedDay)}
              onSelect={(day) => {
                if (!day) return;
                const ts = startOfDay(day).getTime();
                setFocusedDay(ts);
                setDetailDay(ts);
              }}
              weekStartsOn={1}
              components={{
                // Pas de composant `DayContent` dans cette version de react-day-picker :
                // le montant du jour s'ajoute par-dessus la case (`Day` = la cellule <td>)
                // pour ne pas réécrire le bouton du calendrier.
                Day: ({ day, children, ...tdProps }) => {
                  const amount = day.outside
                    ? undefined
                    : calendarAmounts.get(startOfDay(day.date).getTime());
                  return (
                    <td
                      {...tdProps}
                      className={
                        (tdProps.className ? String(tdProps.className) + " " : "") + "relative"
                      }
                    >
                      {children}
                      {amount !== undefined && (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[8px] leading-none lowercase tabular-nums opacity-70">
                          {formatFCFACompact(amount)}
                        </span>
                      )}
                    </td>
                  );
                },
              }}
              className="w-full rounded-md border shadow-sm"
            />
          )}

          {calendarView === "week" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Semaine précédente"
                  onClick={() => setFocusedDay(weekDays[0] - 86400000)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums">
                  {formatDayShort(weekDays[0])} – {formatDayShort(weekDays[6])}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Semaine suivante"
                  onClick={() => setFocusedDay(weekDays[6] + 86400000)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d) => {
                  const selected = d === focusedDay;
                  const amount = calendarAmounts.get(d);
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setFocusedDay(d);
                        setDetailDay(d);
                      }}
                      aria-pressed={selected}
                      className={
                        "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-center " +
                        (selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card hover:bg-accent")
                      }
                    >
                      <span className="text-[10px] leading-none opacity-70 uppercase">
                        {new Date(d)
                          .toLocaleDateString("fr-FR", { weekday: "short" })
                          .replace(".", "")}
                      </span>
                      <span className="text-sm font-semibold leading-none">
                        {new Date(d).getDate()}
                      </span>
                      <span className="text-[9px] leading-none opacity-70 tabular-nums lowercase">
                        {amount !== undefined ? formatFCFACompact(amount) : "\u00A0"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Touchez un jour pour ouvrir son détail.
              </p>
            </div>
          )}

          {calendarView === "day" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Jour précédent"
                  onClick={() => setFocusedDay(focusedDay - 86400000)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">{formatDay(focusedDay)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Jour suivant"
                  onClick={() => setFocusedDay(focusedDay + 86400000)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <DayDetailContent day={focusedDay} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDay !== null} onOpenChange={(v) => !v && setDetailDay(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {detailDay !== null && (
            <>
              <DialogHeader>
                <DialogTitle>Ventes du {formatDay(detailDay)}</DialogTitle>
              </DialogHeader>
              <DayDetailContent day={detailDay} />
            </>
          )}
        </DialogContent>
      </Dialog>

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
                <ComparisonCell
                  label="Clients"
                  value={stats.customersCount}
                  previous={prevStats.customersCount}
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
              <CardTitle className="text-base">Revenus et bénéfices</CardTitle>
              <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                <TabsList>
                  <TabsTrigger value="day">Par jour</TabsTrigger>
                  <TabsTrigger value="week">Par semaine</TabsTrigger>
                  <TabsTrigger value="month">Par mois</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div ref={chartRef}>
                {/* Plus haut relativement à l'écran sur téléphone : 30 jours en
                    `aspect-[2/1]` donnaient un ruban de 150px illisible ; la
                    proportion s'élargit quand la largeur le permet. */}
                <ChartContainer
                  config={chartConfig}
                  className="aspect-[4/3] w-full xs:aspect-[2/1] lg:aspect-[5/2]"
                >
                  <LineChart data={chartBuckets} margin={{ left: 4, right: 8, top: 8 }}>
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
                      className="aspect-[4/3] w-full xs:aspect-[2/1]"
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

      {closures.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historique des clôtures</CardTitle>
            <p className="text-xs text-muted-foreground">
              Les 5 dernières journées clôturées — le rapport figé au moment où on a tourné la clé.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {closures.map((c) => (
              <div key={c.id} className="flex justify-between gap-3">
                <span>{formatDay(c.day)}</span>
                <span className="tabular-nums">
                  <span className="font-medium">{formatFCFA(c.revenue)}</span>{" "}
                  <span className="text-muted-foreground">
                    · {c.sales_count} vente{c.sales_count > 1 ? "s" : ""}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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

/** Photo complète d'un jour : interroge IndexedDB pour CE jour précis (indépendamment
 *  de la période affichée) puis rend CA, paiements, clients, produits vendus. */
function DayDetailContent({ day }: { day: number }) {
  const from = startOfDay(day).getTime();
  const to = from + 86400000;
  const { data, isPending } = usePeriodData(from, to);
  const detail = useMemo(() => {
    const sales = data?.sales ?? [];
    const items = data?.items ?? [];
    return computeDayDetail(sales, items);
  }, [data]);

  if (isPending) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DayStat label="CA" value={formatFCFA(detail.revenue)} />
        <DayStat label="Bénéfice" value={formatFCFA(detail.profit)} />
        <DayStat label="Ventes" value={String(detail.salesCount)} />
        <DayStat label="Clients" value={String(detail.customers)} />
      </div>

      {detail.byPayment.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Paiements</p>
          <div className="flex flex-wrap gap-1.5">
            {detail.byPayment.map((p) => (
              <span
                key={p.method}
                className="rounded-full bg-muted px-2 py-1 text-xs font-medium tabular-nums"
              >
                {PAYMENT_LABELS[p.method]} · {formatFCFA(p.total)}
              </span>
            ))}
          </div>
        </div>
      )}

      {(detail.clients.length > 0 || detail.tables.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {detail.tables.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-1 text-xs">
              Table {t}
            </span>
          ))}
          {detail.clients.map((c) => (
            <span key={c} className="rounded-full bg-muted px-2 py-1 text-xs">
              {c}
            </span>
          ))}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Produits vendus · {detail.itemsCount}
        </p>
        {detail.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente ce jour-là.</p>
        ) : (
          <>
            <div className="space-y-1">
              {detail.products.map((p) => (
                <div key={p.product_id} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">
                    {p.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">×{p.quantity}</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatFCFA(p.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-sm font-medium">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular-nums">{formatFCFA(detail.revenue)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DayStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums">{value}</p>
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

        <p className="text-xs break-words text-muted-foreground">
          {directory ? (
            // `break-all` : un chemin Windows est un jeton sans espace — sans
            // coupure possible il pousse le paragraphe hors de la carte.
            <>
              Destination : <span className="break-all">« {directory} »</span>.{" "}
            </>
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
