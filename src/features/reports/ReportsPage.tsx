import { useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { startOfDay } from "date-fns";
import { formatFCFA } from "@/lib/format";
import {
  NAV_LABEL,
  REVENUE_LABEL,
  VIEWS,
  type CalendarView,
  periodTitle,
  stepDay,
} from "@/lib/reports/period";
import { useReportData } from "@/lib/reports/use-report-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kpi } from "@/components/reports";
import { ProfitSheet } from "@/components/ProfitSheet";
import { CostBatch } from "./CostBatch";

export function ReportsPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [focusedDay, setFocusedDay] = useState<number>(() => startOfDay(Date.now()).getTime());
  const [profitOpen, setProfitOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);

  const { stats, bestLabel } = useReportData(focusedDay, view);

  return (
    <div className="app-container space-y-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold">
            <BarChart3 className="h-6 w-6 shrink-0 text-primary" /> Comptabilité
          </h1>
          <p className="text-sm text-muted-foreground">Montants par période.</p>
        </div>
        <Button variant="outline" onClick={() => setProfitOpen(true)}>
          <Calculator className="h-4 w-4 mr-1.5" /> CA & bénéfices
        </Button>
        <Button variant="outline" onClick={() => setCostOpen(true)}>
          Coûts d'achat
        </Button>
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

      {/* Les deux seuls gestes de la page : le bilan et les coûts d'achat. Le détail
          ligne par ligne vit dans ProfitSheet, la saisie des coûts dans CostBatch. */}
      <ProfitSheet open={profitOpen} onOpenChange={setProfitOpen} />

      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coûts d'achat</DialogTitle>
          </DialogHeader>
          <CostBatch />
        </DialogContent>
      </Dialog>
    </div>
  );
}
