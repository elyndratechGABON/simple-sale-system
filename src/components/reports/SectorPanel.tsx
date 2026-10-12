// Panneau sectorisé de la Comptabilité : « Service » (prestations, clients) ou
// « Boucherie » (poids vendu). N'apparaît que si le secteur a une activité sur la
// période (`showSector`), sinon une carte vide n'apprend rien au commerçant.

import { Scissors, Weight } from "lucide-react";
import type { PeriodStats, WeightSalesStats } from "@/lib/analytics";
import { formatFCFA, formatKg } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Kpi, RankRow } from "./primitives";

export function SectorPanel({
  isService,
  title,
  stats,
  weightSales,
}: {
  isService: boolean;
  title: string;
  stats: PeriodStats | null;
  weightSales: WeightSalesStats | null;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-3 sm:p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {isService ? <Scissors className="h-4 w-4" /> : <Weight className="h-4 w-4" />}
          {isService ? "Service" : "Boucherie"} — {title}
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
        {!isService && weightSales && (
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
  );
}
