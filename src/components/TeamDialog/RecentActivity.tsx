import { Boxes, Clock, Receipt } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { Sale, StockMovement } from "@/lib/db";
import { sellerDisplay } from "./helpers";

/** Actions récentes : dernières ventes et derniers ajustements de stock. */
export function RecentActivity({
  sales,
  movements,
  itemsCount,
}: {
  sales: Sale[];
  movements: StockMovement[];
  itemsCount: Map<string, number>;
}) {
  return (
    <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Receipt className="h-4 w-4 text-primary" /> Ventes récentes
        </p>
        <div className="space-y-1.5">
          {sales.slice(0, 8).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {sellerDisplay(s.seller_name)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {itemsCount.get(s.id) ?? 0} art. ·{" "}
                    {new Date(s.timestamp).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatFCFA(s.total)}</span>
            </div>
          ))}
          {sales.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune vente récente.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Boxes className="h-4 w-4 text-primary" /> Ajustements de stock
        </p>
        <div className="space-y-1.5">
          {movements.slice(0, 8).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {m.delta > 0 ? "+" : ""}
                  {m.delta} {m.product_name.slice(0, 14)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              </div>
              <span
                className={
                  m.delta > 0
                    ? "shrink-0 font-medium text-emerald-600 tabular-nums"
                    : "shrink-0 font-medium text-red-600 tabular-nums"
                }
              >
                {m.delta > 0 ? "+" : ""}
                {m.delta}
              </span>
            </div>
          ))}
          {movements.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun ajustement récent.</p>
          )}
        </div>
      </div>
    </div>
  );
}
