import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { startOfDay } from "date-fns";
import { formatFCFA } from "@/lib/format";
import { REVENUE_LABEL, type CalendarView } from "@/lib/reports/period";
import { useReportData } from "@/lib/reports/use-report-data";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Kpi } from "@/components/reports";
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
  const [costOpen, setCostOpen] = useState(false);
  const [costSelection, setCostSelection] = useState<string[]>([]);

  // Source unique de la période : `PeriodNav` la pilote, les DEUX onglets la lisent.
  const { stats, isLoading, items, products } = useReportData(focusedDay, view);
  const { sold, global } = useCostAlerts(items, products);

  function openCostBatch(ids: string[]) {
    setCostSelection(ids);
    setCostOpen(true);
  }

  return (
    <div className="app-container space-y-4 py-4">
      <header>
        <h1 className="text-page-title flex items-center gap-2 font-bold">
          <BarChart3 className="h-6 w-6 shrink-0 text-primary" /> Comptabilité
        </h1>
        <p className="text-sm text-muted-foreground">Montants par période.</p>
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
          {/* Tombes chiffrées : sous le sac de la requête, un « 0 FCFA » affiché
              une demi-seconde serait une information False — on affiche un état
              de chargement FAITHFUL à la place. */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:p-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </>
              ) : (
                <>
                  <Kpi label="Chiffre d'affaires" value={formatFCFA(stats?.revenue ?? 0)} accent />
                  <Kpi label="Ventes" value={String(stats?.salesCount ?? 0)} />
                </>
              )}
            </CardContent>
          </Card>
          {!isLoading ? (
            <DataTab
              items={items}
              revenue={stats?.revenue ?? 0}
              salesCount={stats?.salesCount ?? 0}
            />
          ) : (
            <Skeleton className="h-40" />
          )}
          {!isLoading && stats && stats.topProducts.length > 0 && (
            <div className="flat-card p-3 sm:p-4 space-y-1.5">
              <h2 className="text-title font-semibold">Top produits</h2>
              {stats.topProducts.slice(0, 5).map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-2 text-sm">
                  <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{p.quantity}×</span>
                  <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
                    {formatFCFA(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trois KPI, pas quatre : le bénéfice est devenu la CONCLUSION de l'onglet, dans le
              bloc final de `ProfitTab` — l'afficher aussi en haut aurait mis le même
              chiffre deux fois sur le même écran. `DataTab` porte de même ses deux KPI
              dans l'onglet Données. */}
          <div className="flat-card grid grid-cols-3 divide-x divide-border p-0">
            {isLoading ? (
              <>
                <div className="p-3 py-4"><Skeleton className="h-10" /></div>
                <div className="p-3 py-4"><Skeleton className="h-10" /></div>
                <div className="p-3 py-4"><Skeleton className="h-10" /></div>
              </>
            ) : (
              <>
                <div className="px-3 py-4 text-center">
                  <span className="block text-small">{REVENUE_LABEL[view]}</span>
                  <span className="mt-1 block text-title font-bold text-foreground tabular-nums accent">
                    {formatFCFA(stats?.revenue ?? 0)}
                  </span>
                </div>
                <div className="px-3 py-4 text-center">
                  <span className="block text-small">Ventes</span>
                  <span className="mt-1 block text-title font-bold text-foreground tabular-nums">
                    {String(stats?.salesCount ?? 0)}
                  </span>
                </div>
                <div className="px-3 py-4 text-center">
                  <span className="block text-small">Panier moyen</span>
                  <span className="mt-1 block text-title font-bold text-foreground tabular-nums">
                    {stats && stats.salesCount > 0 ? formatFCFA(stats.averageBasket) : "—"}
                  </span>
                </div>
              </>
            )}
          </div>

          <CostAlerts sold={sold} global={global} onOpenCostBatch={openCostBatch} />

          <ProfitTab products={products} items={items} focusedDay={focusedDay} view={view} />
        </div>
      )}

      {/* Le UN dialogue restant, avec UN déclencheur : la saisie des coûts EN LOT, ouverte
          par l'alerte « produits sans coût », qui lui passe les produits à traiter
          PRÉSÉLECTIONNÉS. Un bouton dans le titre l'ouvrirait vide, donc en doublon —
          d'où l'absence de « Coûts d'achat » dans l'en-tête. Le « Bilan mensuel » qui
          l'a précédé a été retiré : l'onglet Bénéfice rend visible tout ce qu'il disait,
          recalculé en direct. */}
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
