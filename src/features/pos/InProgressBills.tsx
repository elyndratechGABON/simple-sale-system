import { Utensils, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { Sale } from "@/lib/db";
import type { PosController } from "./usePos";

interface InProgressBillsProps {
  pos: PosController;
  onCheckout: (sale: Sale) => void;
}

export function InProgressBills({ pos, onCheckout }: InProgressBillsProps) {
  if (!pos.hasTables) return null;
  if (pos.openTables.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Factures en cours ({pos.openTables.length})
        </h3>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {pos.openTables.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3"
            onClick={() => pos.setOrdersOpen(true)}
            style={{ cursor: "pointer" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">Table {sale.table}</span>
                <span className="font-bold text-primary tabular-nums">
                  {sale.total > 0 ? `${sale.total.toLocaleString("fr-FR")} €` : "—"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {sale.opened_at
                  ? new Date(sale.opened_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
              disabled={sale.total <= 0}
            >
              Encaisser
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
