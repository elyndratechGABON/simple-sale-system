import { Coins } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { computePeriodStats } from "@/lib/analytics";
import { monthLabel } from "@/lib/profit";
import { cn } from "@/lib/utils";
import { ManualCalculator } from "./ManualCalculator";
import { TOP_PRODUCTS } from "./constants";

/** Vue « Détaillé » : bénéfice par produit (coûts des rapports) + calculateur d'avant encaissement. */
export function DetailView({
  stats,
  expenseByProduct,
  month,
}: {
  stats: ReturnType<typeof computePeriodStats> | null;
  expenseByProduct: Map<string, number>;
  month: string;
}) {
  return (
    <>
      {/* Bénéfice par produit — coûts d'acquisition saisis dans les rapports */}
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Coins className="h-4 w-4" /> Bénéfice par produit
        </p>
        {stats && stats.topProducts.length > 0 ? (
          <div className="divide-y divide-border rounded-xl border">
            {stats.topProducts.slice(0, TOP_PRODUCTS).map((p) => {
              const knownProd = expenseByProduct.has(p.product_id);
              return (
                <div key={p.product_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {p.quantity} × {formatFCFA(p.revenue / p.quantity)}
                  </span>
                  <span
                    className={cn(
                      "w-24 shrink-0 text-right tabular-nums",
                      knownProd ? "font-semibold" : "text-muted-foreground/60",
                    )}
                  >
                    {knownProd ? formatFCFA(p.profit) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Aucune vente encaissée sur {monthLabel(month)}.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Coûts saisis dans les Rapports › Coûts d'acquisition. Sans coût, « — ».
        </p>
      </div>

      <ManualCalculator />
    </>
  );
}
