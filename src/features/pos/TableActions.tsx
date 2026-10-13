import { CreditCard, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { PosController } from "./usePos";

/**
 * Actions spécifiques au mode Tables : affiche le total de la table active
 * et propose d'encaisser en basculant vers le mode Comptoir.
 */
export function TableActions({ pos }: { pos: Pick<PosController, "activeTable" | "setMode"> }) {
  const table = pos.activeTable;
  if (!table) return null;

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Table {table.table}</p>
          <p className="text-lg font-bold tabular-nums text-primary">{formatFCFA(table.total)}</p>
        </div>
      </div>
      <Button className="w-full h-12 gap-2" onClick={() => pos.setMode("comptoir")}>
        <CreditCard className="h-5 w-5" />
        Encaisser → Comptoir
      </Button>
    </div>
  );
}
