import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { fr } from "react-day-picker/locale";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import type { PaymentMethod } from "@/lib/db";
import { computeDayDetail, computePeriodStats } from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { formatDay, formatDayShort, formatFCFA, formatFCFACompact } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    </div>
  );
}

/** Photo complète d'un jour : interroge IndexedDB pour CE jour précis puis rend CA,
 *  paiements, clients, produits vendus. */
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
