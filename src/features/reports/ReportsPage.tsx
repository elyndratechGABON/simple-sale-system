import { useState } from "react";
import { BarChart3, Calculator } from "lucide-react";
import { startOfDay } from "date-fns";
import { formatFCFA } from "@/lib/format";
import { REVENUE_LABEL, type CalendarView } from "@/lib/reports/period";
import { useReportData } from "@/lib/reports/use-report-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kpi } from "@/components/reports";
import { ProfitSheet } from "@/components/ProfitSheet";
import { CostBatch } from "./CostBatch";
import { CostAlerts } from "./CostAlerts";
import { DataTab } from "./DataTab";
import { PeriodNav } from "./PeriodNav";
import { ProfitTab } from "./ProfitTab";
import { useCostAlerts } from "./useCostAlerts";

type Onglet = "donnees" | "benefice";

export function ReportsPage() {
  const [onglet, setOnglet] = useState<Onglet>("donnees");
  const [view, setView] = useState<CalendarView>("month");
  const [focusedDay, setFocusedDay] = useState<number>(() => startOfDay(Date.now()).getTime());
  const [profitOpen, setProfitOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [costSelection, setCostSelection] = useState<string[]>([]);

  // Source unique de la période : `PeriodNav` la pilote, les DEUX onglets la lisent.
  const { stats, items, products } = useReportData(focusedDay, view);
  const { sold, global } = useCostAlerts(items, products);

  function openCostBatch(ids: string[]) {
    setCostSelection(ids);
    setCostOpen(true);
  }

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
          <Calculator className="h-4 w-4 mr-1.5" /> Bilan mensuel
        </Button>
      </header>

      <PeriodNav
        view={view}
        onViewChange={setView}
        focusedDay={focusedDay}
        onFocusedDayChange={setFocusedDay}
      />

      <Tabs value={onglet} onValueChange={(v) => setOnglet(v as Onglet)}>
        <TabsList>
          <TabsTrigger value="donnees">Données</TabsTrigger>
          <TabsTrigger value="benefice">Bénéfice</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Un seul onglet monté à la fois : `DataTab` et `ProfitTab` portent chacun leurs
          requêtes, inutile de payer les deux pour l'affichage d'un seul. */}
      {onglet === "donnees" ? (
        <div className="space-y-4">
          <DataTab
            items={items}
            revenue={stats?.revenue ?? 0}
            salesCount={stats?.salesCount ?? 0}
          />
          {stats && stats.topProducts.length > 0 && (
            <Card>
              <CardContent className="space-y-1.5 p-3 sm:p-4">
                <h2 className="text-sm font-semibold">Top produits</h2>
                {stats.topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-2 text-sm">
                    <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {p.quantity}×
                    </span>
                    <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
                      {formatFCFA(p.revenue)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Les 4 KPI vivent ici : `DataTab` porte déjà les siens dans l'autre onglet,
              les afficher aussi au-dessus des onglets serait la même vérité deux fois. */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:grid-cols-4 sm:p-4">
              <Kpi label={REVENUE_LABEL[view]} value={formatFCFA(stats?.revenue ?? 0)} accent />
              <Kpi label="Ventes" value={String(stats?.salesCount ?? 0)} />
              <Kpi
                label="Panier moyen"
                value={stats && stats.salesCount > 0 ? formatFCFA(stats.averageBasket) : "—"}
              />
              <Kpi
                label="Bénéfice"
                value={stats ? formatFCFA(stats.profit) : "—"}
                hint={
                  sold.length > 0
                    ? `⚠ ${sold.length} vendu${sold.length > 1 ? "s" : ""} sans coût`
                    : undefined
                }
              />
            </CardContent>
          </Card>

          <CostAlerts sold={sold} global={global} onOpenCostBatch={openCostBatch} />

          <ProfitTab products={products} items={items} focusedDay={focusedDay} view={view} />
        </div>
      )}

      {/* Deux dialogues restants, chacun avec UN déclencheur :
          — « Bilan mensuel » (bouton du titre) : la vue profonde, stock valorisé et
            calculette. Son nom le disait « CA & bénéfices », ce qui ne distinguait plus rien
            depuis que « Bénéfice » est aussi un KPI de l'onglet.
          — le saisie des coûts EN LOT : ouverte par l'alerte « produits sans coût », qui lui
            passe les produits à traiter PRÉSÉLECTIONNÉS. Un bouton dans le titre l'ouvrirait
            vide, donc en doublon — d'où l'absence de « Coûts d'achat » dans l'en-tête. */}
      <ProfitSheet open={profitOpen} onOpenChange={setProfitOpen} />

      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compléter les coûts manquants</DialogTitle>
          </DialogHeader>
          {/* La clé force le remontage : la sélection pré-cochée n'est lue qu'au montage. */}
          <CostBatch key={costSelection.join("|")} initialSelected={costSelection} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
