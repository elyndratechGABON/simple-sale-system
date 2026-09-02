import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Scissors, Weight } from "lucide-react";
import { fr } from "react-day-picker/locale";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import type { PaymentMethod } from "@/lib/db";
import { listProducts } from "@/lib/db";
import { computeDayDetail, computePeriodStats, computeWeightSales } from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { useClusterFeatures } from "@/hooks/use-cluster-features";
import { formatDay, formatDayShort, formatFCFA, formatFCFACompact, formatKg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
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

/** Minuit du lundi de la semaine (lundi) qui contient `ts`. */
function startOfWeekMonday(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Vue du calendrier des ventes : grille du mois, bande de la semaine, ou jour seul. */
type CalendarView = "month" | "week" | "day";

function ReportsPage() {
  // Calendrier des ventes : vue (mois/semaine/jour), jour en focus, jour ouvert en détail.
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [focusedDay, setFocusedDay] = useState<number>(() => startOfDay(Date.now()).getTime());
  const [detailDay, setDetailDay] = useState<number | null>(null);
  // Sélection de période personnalisée (range picker)
  const [rangeFrom, setRangeFrom] = useState<number | null>(null);
  const [rangeTo, setRangeTo] = useState<number | null>(null);

  // Montant par jour du mois affiché — indépendant de toute période choisie, pour que
  // chaque cellule porte son revenu.
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

  const { isService, hasWeightInput } = useClusterFeatures();
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
    staleTime: 30_000,
  });

  // Période du rapport sectorisé : celle que montre le calendrier (mois entier, bande
  // de la semaine, ou seul jour en focus). On la re-questionne une seule fois, indexée,
  // pour que boucherie et service partagent les mêmes ventes que le calendrier.
  const sectorRange = useMemo(() => {
    if (calendarView === "week") return { from: weekDays[0], to: weekDays[6] + 86400000 };
    if (calendarView === "day") {
      const from = startOfDay(focusedDay).getTime();
      return { from, to: from + 86400000 };
    }
    return { from: calendarMonthStart, to: calendarMonthEnd };
  }, [calendarView, focusedDay, weekDays, calendarMonthStart, calendarMonthEnd]);
  const { data: sectorData } = usePeriodData(sectorRange.from, sectorRange.to);

  const sectorStats = useMemo(
    () =>
      sectorData
        ? computePeriodStats(
            sectorData.sales,
            sectorData.items,
            sectorRange.from,
            sectorRange.to,
            [],
          )
        : null,
    [sectorData, sectorRange],
  );
  const weightSales = useMemo(
    () =>
      sectorData && (sectorData.items.length > 0 || (products ?? []).length > 0)
        ? computeWeightSales(sectorData.items, products ?? [])
        : null,
    [sectorData, products],
  );

  const periodLabel =
    calendarView === "month"
      ? new Date(sectorRange.from).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : calendarView === "week"
        ? `${formatDayShort(weekDays[0])} – ${formatDayShort(weekDays[6])}`
        : formatDay(focusedDay);

  return (
    <div className="app-container space-y-6 py-6">
      <div>
        <h1 className="text-page-title flex items-center gap-2 font-bold">
          <CalendarDays className="h-6 w-6 shrink-0" /> Rapports
        </h1>
        <p className="text-sm text-muted-foreground">
          Montants par jour — touchez une date pour ouvrir le détail.
        </p>
      </div>

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
                        <span className="pointer-events-none absolute inset-x-0 bottom-0.5 flex justify-center rounded-full bg-primary/10 px-1.5 text-[8px] leading-none lowercase tabular-nums text-primary">
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
              <DayDetailContent
                day={focusedDay}
                isService={isService}
                hasWeightInput={hasWeightInput}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Période personnalisée ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Période personnalisée
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>
          {rangeFrom != null && rangeTo != null && rangeTo > rangeFrom && (
            <div className="rounded-lg border p-3 text-sm bg-muted/30">
              <div className="flex justify-between font-medium">
                <span>Plage sélectionnée</span>
                <span>
                  {new Date(rangeFrom).toLocaleDateString("fr-FR")} →{" "}
                  {new Date(rangeTo - 86400000).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                L'agrégat de cette période s'affiche dans le panneau de statistiques ci-dessus
                (calendrier actuel).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {(isService
        ? sectorStats && (sectorStats.salesCount > 0 || sectorStats.customersCount > 0)
        : hasWeightInput
          ? weightSales && weightSales.weightKg > 0
          : false) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {isService ? <Scissors className="h-4 w-4" /> : <Weight className="h-4 w-4" />}
              {isService ? "Service" : "Boucherie"} — {periodLabel}
            </CardTitle>
          </CardHeader>
          {isService && sectorStats && (
            <>
              <div className="grid grid-cols-3 gap-3 border-b p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
                  <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                    {formatFCFA(sectorStats.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prestations</p>
                  <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                    {sectorStats.salesCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clients</p>
                  <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                    {sectorStats.customersCount}
                  </p>
                </div>
              </div>
              {sectorStats.topProducts.length > 0 && (
                <div className="space-y-1 p-2">
                  {sectorStats.topProducts.slice(0, 3).map((p, index) => (
                    <div
                      key={p.product_id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {p.quantity} prestation{p.quantity > 1 ? "s" : ""}
                      </span>
                      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatFCFA(p.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!isService && hasWeightInput && weightSales && (
            <>
              <div className="grid grid-cols-3 gap-3 border-b p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Vendu au poids</p>
                  <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                    {formatKg(weightSales.weightKg)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Poids moyen / pesée</p>
                  <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                    {formatKg(weightSales.avgWeightKg)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
                  <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                    {formatFCFA(weightSales.revenue)}
                  </p>
                </div>
              </div>
              {weightSales.byProduct.length > 0 && (
                <div className="space-y-1 p-2">
                  {weightSales.byProduct.slice(0, 3).map((product, index) => (
                    <div
                      key={product.product_id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {product.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatKg(product.weightKg)} vendus
                      </span>
                      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatFCFA(product.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      <Dialog open={detailDay !== null} onOpenChange={(v) => !v && setDetailDay(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {detailDay !== null && (
            <>
              <DialogHeader>
                <DialogTitle>Ventes du {formatDay(detailDay)}</DialogTitle>
              </DialogHeader>
              <DayDetailContent
                day={detailDay}
                isService={isService}
                hasWeightInput={hasWeightInput}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
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

function DayStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
