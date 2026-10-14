import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { Sale } from "@/lib/db";
import type { PosController } from "./usePos";

interface InProgressBillsProps {
  pos: PosController;
  onCheckout: (sale: Sale) => void;
}

export function InProgressBills({ pos, onCheckout }: InProgressBillsProps) {
  if (!pos.hasTables || pos.openTables.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Factures en cours ({pos.openTables.length})
      </h3>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {pos.openTables.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">Table {sale.table}</span>
                <span className="font-bold text-primary tabular-nums">
                  {sale.total > 0 ? formatFCFA(sale.total) : "—"}
                </span>
              </div>
              {sale.opened_at && (
                <div className="text-xs text-muted-foreground">
                  Ouverte à{" "}
                  {new Date(sale.opened_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={sale.total <= 0}
              onClick={() => onCheckout(sale)}
            >
              Encaisser
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
