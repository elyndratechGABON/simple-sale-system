// Comptabilité — shell d'assemblage.
//
// Ce fichier ne fait QUE composer. Tout ce qui est affichable vit dans
// `src/components/reports/`, les calculs de période dans `src/lib/reports/period.ts`.
// Il faisait 1030 lignes avec neuf composants imbriqués : aucun n'était testable et
// le calendrier ne pouvait pas évoluer sans toucher la page entière.
//
// L'URL reste `/reports` (renommer casserait les liens, le BottomNav et `useAccess`) ;
// seul le libellé a changé. Voir PRD v2.0 §5.4.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { startOfDay, startOfMonth } from "date-fns";
import { useClusterFeatures } from "@/hooks/use-cluster-features";
import { formatFCFA } from "@/lib/format";
import {
  NAV_LABEL,
  REVENUE_LABEL,
  VIEWS,
  type CalendarView,
  periodTitle,
  startOfWeekMonday,
  stepDay,
} from "@/lib/reports/period";
import { useReportData } from "@/lib/reports/use-report-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AssetReminders,
  DayDetailContent,
  DayDetailDialog,
  Kpi,
  MonthGrid,
  RangeDialog,
  SectorPanel,
  SelectedDayCard,
  WeekStrip,
  YearGrid,
} from "@/components/reports";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [{ title: "Comptabilité — ELYNDRA CAISSE" }],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [focusedDay, setFocusedDay] = useState<number>(() => startOfDay(Date.now()).getTime());
  const [detailOpen, setDetailOpen] = useState(false);

  const { isService, hasWeightInput } = useClusterFeatures();

  const { stats, days, months, weightSales, assetEvents, assetAgenda, bestLabel } = useReportData(
    focusedDay,
    view,
  );

  // Règle d'origine, conservée mot pour mot : service s'affiche s'il y a eu une vente
  // sur la période, boucherie s'il y a eu du poids, rien sinon. Une carte vide
  // n'apprend rien au commerçant.
  const showSector = isService
    ? (stats?.salesCount ?? 0) > 0
    : hasWeightInput
      ? (weightSales?.weightKg ?? 0) > 0
      : false;

  return (
    <div className="app-container space-y-4 py-4">
      <header>
        <h1 className="text-page-title flex items-center gap-2 font-bold">
          <BarChart3 className="h-6 w-6 shrink-0 text-primary" /> Comptabilité
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
              assetEvents={assetEvents}
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

        {/* Retours d'actifs : en retard d'abord, donc le plus urgent en haut.
            Passe avant le détail du jour, c'est une échéance, pas une stat. */}
        {assetAgenda.length > 0 && <AssetReminders rows={assetAgenda} onSelect={setFocusedDay} />}

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
        <SectorPanel
          isService={isService}
          title={periodTitle(focusedDay, view)}
          stats={stats}
          weightSales={weightSales}
        />
      )}

      {/* ── Période personnalisée : repliée derrière un bouton (§20) ── */}
      <RangeDialog />

      {/* Détail complet : mécanisme existant, réutilisé tel quel. */}
      <DayDetailDialog
        day={focusedDay}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isService={isService}
        hasWeightInput={hasWeightInput}
      />
    </div>
  );
}
