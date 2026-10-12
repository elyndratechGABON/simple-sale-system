// Résumé de la journée sélectionnée : CA, volume, panier moyen et répartition réelle.
// Renvoie vers le détail complet existant plutôt que de le dupliquer.

import { CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { startOfDay } from "date-fns";
import { computeDayDetail } from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { formatDay, formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Kpi } from "./primitives";

export function SelectedDayCard({
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
