import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Scissors,
  SlidersHorizontal,
  Weight,
} from "lucide-react";
import { addDays, addMonths, addYears, endOfYear, startOfDay, startOfMonth, startOfYear } from "date-fns";
import type { PaymentMethod } from "@/lib/db";
import { listProducts } from "@/lib/db";
import type { DayBucket } from "@/lib/analytics";
import { computeDayDetail, computePeriodStats, computeWeightSales } from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { useClusterFeatures } from "@/hooks/use-cluster-features";
import { formatDay, formatDayShort, formatFCFA, formatFCFACompact, formatKg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [{ title: "Rapports — ELYNDRA CAISSE" }],
  }),
  component: ReportsPage,
});

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "Carte",
  mobile_money: "Mobile Money",
};

/** Granularités de la page. `focusedDay` sert à la fois d'ancre de période et de
 *  jour sélectionné : naviguer change les deux, donc le détail suit toujours la vue. */
type CalendarView = "month" | "week" | "day" | "year";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mois" },
  { value: "week", label: "Semaine" },
  { value: "day", label: "Jour" },
  { value: "year", label: "Année" },
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Libellé du premier KPI : dépend de la granularité, le reste est identique partout. */
const REVENUE_LABEL: Record<CalendarView, string> = {
  month: "CA du mois",
  week: "CA semaine",
  day: "CA du jour",
  year: "CA annuel",
};

/** Minuit du lundi de la semaine (lundi) qui contient `ts`. */
function startOfWeekMonday(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Décale l'ancre d'une période, sans jamais coder une date en dur. */
function stepDay(ts: number, view: CalendarView, dir: 1 | -1): number {
  if (view === "month") return addMonths(ts, dir).getTime();
  if (view === "year") return addYears(ts, dir).getTime();
  if (view === "week") return addDays(ts, dir * 7).getTime();
  return addDays(ts, dir).getTime();
}

function periodTitle(ts: number, view: CalendarView): string {
  if (view === "year") return String(new Date(ts).getFullYear());
  if (view === "week") {
    const mon = startOfWeekMonday(ts);
    return `${formatDayShort(mon)} – ${formatDayShort(mon + 6 * 86400000)}`;
  }
  if (view === "day") return formatDay(ts);
  const label = new Date(ts).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const NAV_LABEL: Record<CalendarView, string> = {
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  year: "Année",
};

function ReportsPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [focusedDay, setFocusedDay] = useState<number>(() => startOfDay(Date.now()).getTime());
  const [detailOpen, setDetailOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState<number | null>(null);
  const [rangeTo, setRangeTo] = useState<number | null>(null);

  const { isService, hasWeightInput } = useClusterFeatures();
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
    staleTime: 30_000,
  });

  // Une seule requête, indexée sur la période affichée. `computePeriodStats` renvoie
  // TOUS les jours de l'intervalle, à zéro quand il n'y a pas eu de vente : c'est cette
  // série qui alimente le calendrier, la semaine et l'année, donc pas de doublon.
  const range = useMemo(() => {
    if (view === "year") {
      const y = startOfYear(focusedDay).getTime();
      return { from: y, to: endOfYear(focusedDay).getTime() + 86400000 };
    }
    if (view === "week") {
      const mon = startOfWeekMonday(focusedDay);
      return { from: mon, to: mon + 7 * 86400000 };
    }
    if (view === "day") {
      const from = startOfDay(focusedDay).getTime();
      return { from, to: from + 86400000 };
    }
    const from = startOfMonth(focusedDay).getTime();
    return { from, to: addMonths(from, 1).getTime() };
  }, [view, focusedDay]);

  const { data } = usePeriodData(range.from, range.to);
  const stats = useMemo(
    () => (data ? computePeriodStats(data.sales, data.items, range.from, range.to) : null),
    [data, range.from, range.to],
  );

  const days = useMemo(() => new Map((stats?.days ?? []).map((d) => [d.day, d])), [stats]);

  // Année : agrégation mensuelle de la même série, réutilisée telle quelle.
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

  // « Meilleur » dépend de la granularité : un jour en mois/semaine/jour, un mois en année.
  const bestLabel = (() => {
    if (view === "year") {
      let best: (typeof months)[number] | null = null;
      for (const m of months) if (!best || m.revenue > best.revenue) best = m;
      return best && best.revenue > 0 ? best.label : "—";
    }
    return stats?.bestDay
      ? new Date(stats.bestDay.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      : "—";
  })();

  const showSector = (isService ? (stats?.salesCount ?? 0) > 0 : hasWeightInput ? (weightSales?.weightKg ?? 0) > 0 : false);

  return (
    <div className="app-container space-y-4 py-4">
      <header>
        <h1 className="text-page-title flex items-center gap-2 font-bold">
          <BarChart3 className="h-6 w-6 shrink-0 text-primary" /> Rapports
        </h1>
        <p className="text-sm text-muted-foreground">
          Montants par période — touchez une date pour ouvrir le détail.
        </p>
      </header>

      {/* Granularité : quatre choix, l'actif au vert principal. */}
      <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
        <TabsList className="grid w-full grid-cols-4">
          {VIEWS.map((v) => (
            <TabsTrigger key={v.value} value={v.value} className="text-xs sm:text-sm">
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── Tête de période + KPI ─────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${NAV_LABEL[view]} précédent`}
            onClick={() => setFocusedDay(stepDay(focusedDay, view, -1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold tabular-nums sm:text-lg">
            {periodTitle(focusedDay, view)}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${NAV_LABEL[view]} suivant`}
            onClick={() => setFocusedDay(stepDay(focusedDay, view, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Un seul bloc, quatre zones. Deux lignes sur mobile, une sur grand écran. */}
        <Card>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:grid-cols-4 sm:p-4">
            <Kpi label={REVENUE_LABEL[view]} value={formatFCFA(stats?.revenue ?? 0)} accent />
            <Kpi label="Ventes" value={String(stats?.salesCount ?? 0)} />
            <Kpi
              label="Panier moyen"
              value={stats && stats.salesCount > 0 ? formatFCFA(stats.averageBasket) : "—"}
            />
            <Kpi
              label={view === "year" ? "Meilleur mois" : "Meilleur jour"}
              value={bestLabel}
              hint={
                view === "year"
                  ? undefined
                  : stats?.bestDay
                    ? formatFCFA(stats.bestDay.revenue)
                    : undefined
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Corps : calendrier / bande de semaine / journée / année ── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-3">
          {view === "month" && (
            <MonthGrid
              month={startOfMonth(focusedDay).getTime()}
              days={days}
              selected={focusedDay}
              onSelect={setFocusedDay}
            />
          )}
          {view === "week" && (
            <WeekStrip
              weekStart={startOfWeekMonday(focusedDay)}
              days={days}
              selected={focusedDay}
              onSelect={setFocusedDay}
            />
          )}
          {view === "day" && (
            <DayDetailContent
              day={focusedDay}
              isService={isService}
              hasWeightInput={hasWeightInput}
            />
          )}
          {view === "year" && (
            <YearGrid
              months={months}
              selectedMonth={new Date(focusedDay).getMonth()}
              onSelect={(m) => {
                setFocusedDay(new Date(new Date(focusedDay).getFullYear(), m, 1).getTime());
                setView("month");
              }}
            />
          )}
        </div>

        {/* Détail de la journée : sous le calendrier sur mobile, à sa droite dès que
            la largeur le permet (§18/§19 — une seule interface, pas deux). */}
        {view !== "day" && (
          <SelectedDayCard
            day={focusedDay}
            onOpenDetail={() => setDetailOpen(true)}
            showHint={view === "month" || view === "week"}
          />
        )}
      </div>

      {showSector && (
        <Card>
          <CardContent className="space-y-3 p-3 sm:p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              {isService ? <Scissors className="h-4 w-4" /> : <Weight className="h-4 w-4" />}
              {isService ? "Service" : "Boucherie"} — {periodTitle(focusedDay, view)}
            </p>
            {isService && stats && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Kpi label="Chiffre d'affaires" value={formatFCFA(stats.revenue)} accent small />
                  <Kpi label="Prestations" value={String(stats.salesCount)} small />
                  <Kpi label="Clients" value={String(stats.customersCount)} small />
                </div>
                {stats.topProducts.slice(0, 3).map((p, i) => (
                  <RankRow
                    key={p.product_id}
                    index={i + 1}
                    name={p.name}
                    meta={`${p.quantity} prestation${p.quantity > 1 ? "s" : ""}`}
                    value={formatFCFA(p.revenue)}
                  />
                ))}
              </>
            )}
            {!isService && hasWeightInput && weightSales && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Kpi label="Vendu au poids" value={formatKg(weightSales.weightKg)} accent small />
                  <Kpi label="Poids moyen" value={formatKg(weightSales.avgWeightKg)} small />
                  <Kpi label="Chiffre d'affaires" value={formatFCFA(weightSales.revenue)} small />
                </div>
                {weightSales.byProduct.slice(0, 3).map((p, i) => (
                  <RankRow
                    key={p.product_id}
                    index={i + 1}
                    name={p.name}
                    meta={`${formatKg(p.weightKg)} vendus`}
                    value={formatFCFA(p.revenue)}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Période personnalisée : repliée derrière un bouton (§20) ── */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setRangeOpen(true)}
      >
        <SlidersHorizontal className="mr-2 h-4 w-4" /> Période personnalisée
      </Button>

      {/* Détail complet : mécanisme existant, réutilisé tel quel. */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ventes du {formatDay(focusedDay)}</DialogTitle>
          </DialogHeader>
          <DayDetailContent
            day={focusedDay}
            isService={isService}
            hasWeightInput={hasWeightInput}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Période personnalisée</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="range-start" className="text-xs">
                Début
              </Label>
              <Input
                id="range-start"
                type="date"
                value={rangeFrom ? new Date(rangeFrom).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setRangeFrom(
                    e.target.value ? new Date(e.target.value + "T00:00:00").getTime() : null,
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="range-end" className="text-xs">
                Fin
              </Label>
              <Input
                id="range-end"
                type="date"
                value={rangeTo ? new Date(rangeTo).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setRangeTo(
                    e.target.value
                      ? new Date(e.target.value + "T00:00:00").getTime() + 86400000
                      : null,
                  )
                }
                min={rangeFrom ? new Date(rangeFrom).toISOString().split("T")[0] : undefined}
              />
            </div>
            {rangeFrom != null && rangeTo != null && rangeTo > rangeFrom && (
              <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                Du {new Date(rangeFrom).toLocaleDateString("fr-FR")} au{" "}
                {new Date(rangeTo - 86400000).toLocaleDateString("fr-FR")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Navigation rapide ci-dessus : Mois, Semaine, Jour et Année couvrent l'usage
              courant ; la plage libre reste pour un export ponctuel.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Une zone du bloc KPI. `accent` met la valeur en vert principal et en gras. */
function Kpi({
  label,
  value,
  hint,
  accent,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate font-semibold tabular-nums",
          small ? "text-sm" : "text-base sm:text-lg",
          accent ? "text-primary" : "",
        )}
      >
        {value}
      </p>
      {hint && <p className="truncate text-[11px] text-muted-foreground tabular-nums">{hint}</p>}
    </div>
  );
}

/**
 * Grille du mois. Chaque cellule porte le montant RÉEL du jour (`days` vient de
 * `computePeriodStats`), une barre proportionnelle au meilleur jour du mois et un
 * point d'activité. Les jours voisins du mois sont des Cases vides et non cliquables :
 * leur montant n'est pas dans la requête, donc on ne l'invente pas (§22).
 */
function MonthGrid({
  month,
  days,
  selected,
  onSelect,
}: {
  month: number;
  days: Map<number, DayBucket>;
  selected: number;
  onSelect: (ts: number) => void;
}) {
  const first = new Date(month);
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const max = useMemo(() => {
    let m = 0;
    for (const d of days.values()) if (d.revenue > m) m = d.revenue;
    return m;
  }, [days]);

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => startOfDay(new Date(month + i * 86400000)).getTime()),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((ts, i) => {
            if (ts === null) return <div key={`e${i}`} aria-hidden className="h-[58px] sm:h-16" />;
            const bucket = days.get(ts);
            const revenue = bucket?.revenue ?? 0;
            const isSel = ts === selected;
            const ratio = max > 0 ? revenue / max : 0;
            const hot = ratio > 0.75;
            return (
              <button
                key={ts}
                onClick={() => onSelect(ts)}
                aria-pressed={isSel}
                aria-label={`${formatDay(ts)} — ${revenue > 0 ? formatFCFA(revenue) : "aucune vente"}`}
                className={cn(
                  "flex h-[58px] flex-col justify-between rounded-xl border p-1 text-left transition-colors sm:h-16 sm:p-1.5",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : revenue > 0
                      ? "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                      : "border-transparent bg-muted/40",
                  hot && !isSel && "ring-1 ring-primary/25",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-medium leading-none tabular-nums">
                    {new Date(ts).getDate()}
                  </span>
                  {revenue > 0 && (
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isSel ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "truncate text-[10px] leading-none tabular-nums sm:text-[11px]",
                    isSel
                      ? "text-primary-foreground/90"
                      : revenue > 0
                        ? "font-semibold text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {revenue > 0 ? formatFCFACompact(revenue) : "—"}
                </span>
                {/* Barre d'intensité : verte, proportionnelle au CA réel. */}
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 w-full overflow-hidden rounded-full",
                    isSel ? "bg-primary-foreground/30" : "bg-muted",
                  )}
                >
                  <span
                    className={cn("block h-full rounded-full", isSel ? "bg-primary-foreground" : "bg-primary")}
                    style={{ width: `${Math.round(ratio * 100)}%`, opacity: 0.4 + ratio * 0.6 }}
                  />
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Touchez un jour pour voir son détail.
        </p>
      </CardContent>
    </Card>
  );
}

/** Les 7 jours de la semaine, une colonne chacun, CA réel sous la date. */
function WeekStrip({
  weekStart,
  days,
  selected,
  onSelect,
}: {
  weekStart: number;
  days: Map<number, DayBucket>;
  selected: number;
  onSelect: (ts: number) => void;
}) {
  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => {
            const ts = startOfDay(weekStart + i * 86400000).getTime();
            const bucket = days.get(ts);
            const revenue = bucket?.revenue ?? 0;
            const isSel = ts === selected;
            return (
              <button
                key={ts}
                onClick={() => onSelect(ts)}
                aria-pressed={isSel}
                className={cn(
                  "flex min-h-[86px] flex-col items-center gap-1 rounded-xl border p-1.5 transition-colors",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : revenue > 0
                      ? "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                      : "border-transparent bg-muted/40",
                )}
              >
                <span className="text-[10px] uppercase leading-none opacity-70">{w}</span>
                <span className="text-sm font-semibold leading-none tabular-nums">
                  {new Date(ts).getDate()}
                </span>
                <span
                  className={cn(
                    "mt-auto truncate text-[10px] leading-none tabular-nums",
                    isSel ? "text-primary-foreground" : revenue > 0 ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  {revenue > 0 ? formatFCFACompact(revenue) : "—"}
                </span>
                <span
                  className={cn(
                    "text-[9px] leading-none tabular-nums",
                    isSel ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {bucket && bucket.salesCount > 0 ? `${bucket.salesCount} v.` : " "}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Les 12 mois de l'année, chacun cliquable vers la vue Mois correspondante. */
function YearGrid({
  months,
  selectedMonth,
  onSelect,
}: {
  months: { label: string; month: number; revenue: number; salesCount: number }[];
  selectedMonth: number;
  onSelect: (month: number) => void;
}) {
  const max = months.reduce((m, x) => Math.max(m, x.revenue), 0);
  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {months.map((m) => {
            const ratio = max > 0 ? m.revenue / max : 0;
            return (
              <button
                key={m.label}
                onClick={() => onSelect(m.month)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-2 text-left transition-colors",
                  m.month === selectedMonth
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/50",
                )}
              >
                <span className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-xs font-medium">{m.label}</span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px] font-semibold tabular-nums",
                      m.month === selectedMonth ? "text-primary-foreground" : "text-primary",
                    )}
                  >
                    {m.revenue > 0 ? formatFCFACompact(m.revenue) : "—"}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 w-full overflow-hidden rounded-full",
                    m.month === selectedMonth ? "bg-primary-foreground/30" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      m.month === selectedMonth ? "bg-primary-foreground" : "bg-primary",
                    )}
                    style={{ width: `${Math.round(ratio * 100)}%`, opacity: 0.4 + ratio * 0.6 }}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    m.month === selectedMonth ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {m.salesCount > 0 ? `${m.salesCount} ventes` : "aucune vente"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Touchez un mois pour ouvrir son calendrier détaillé.
        </p>
      </CardContent>
    </Card>
  );
}

/** Résumé de la journée sélectionnée : CA, volume, panier moyen et répartition réelle.
 *  Renvoie vers le détail complet existant plutôt que de le dupliquer. */
function SelectedDayCard({
  day,
  onOpenDetail,
  showHint,
}: {
  day: number;
  onOpenDetail: () => void;
  showHint?: boolean;
}) {
  const from = startOfDay(day).getTime();
  const { data, isPending } = usePeriodData(from, from + 86400000);
  const detail = useMemo(() => computeDayDetail(data?.sales ?? [], data?.items ?? []), [data]);

  const basket = detail.salesCount > 0 ? detail.revenue / detail.salesCount : null;
  const top = detail.products.slice(0, 5);
  const maxProduct = top.reduce((m, p) => Math.max(m, p.revenue), 0);

  return (
    <Card className="lg:sticky lg:top-4">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDay(day)}
          </p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {isPending ? "…" : "Jour choisi"}
          </span>
        </div>

        <div>
          <p className="text-2xl font-bold tabular-nums text-primary">
            {formatFCFA(detail.revenue)}
          </p>
          <p className="text-xs text-muted-foreground">CA du jour</p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <Kpi label="Ventes" value={String(detail.salesCount)} small />
          <Kpi label="Panier moyen" value={basket !== null ? formatFCFA(basket) : "—"} small />
        </div>

        {detail.salesCount > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Répartition des ventes</p>
            {top.map((p) => (
              <div key={p.product_id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 tabular-nums">{formatFCFA(p.revenue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${maxProduct > 0 ? Math.round((p.revenue / maxProduct) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(detail.revenue > 0 ? (p.revenue / detail.revenue) * 100 : 0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={onOpenDetail}>
          Voir le détail des ventes
        </Button>
        {showHint && (
          <p className="text-[11px] text-muted-foreground">
            La barre verte d'une journée du calendrier mesure son CA face au meilleur jour.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Photo complète d'un jour : interroge IndexedDB pour CE jour précis puis rend CA,
 *  paiements, clients, produits vendus. */
function DayDetailContent({
  day,
  isService,
  hasWeightInput,
}: {
  day: number;
  isService: boolean;
  hasWeightInput: boolean;
}) {
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
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {hasWeightInput ? formatKg(p.quantity) : `×${p.quantity}`}
                      {isService ? " prestation" : " vente"}
                    </span>
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

/** Ligne de classement du panneau sectorisé (service / boucherie). */
function RankRow({
  index,
  name,
  meta,
  value,
}: {
  index: number;
  name: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1 py-1.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
        {index}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</span>
      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">{value}</span>
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