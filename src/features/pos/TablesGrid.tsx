import { TableCard } from "@/components/pos";
import type { PosController } from "./usePos";
import type { Sale } from "@/lib/db";

interface TablesGridProps {
  pos: Pick<PosController, "floorPlan" | "closeMut" | "hasTables" | "tableVisuals">;
  onTableTap: (label: string, sale: Sale | null) => void;
  /** Encaissement direct depuis la carte — le même checkout que les factures en cours. */
  onEncaisser: (sale: Sale) => void;
}

export function TablesGrid({ pos, onTableTap, onEncaisser }: TablesGridProps) {
  if (!pos.hasTables) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {pos.floorPlan.map(({ label, table }) => (
        <TableCard
          key={label}
          label={label}
          table={table}
          active={false}
          disabled={false}
          onClick={() => onTableTap(label, table)}
          onLongPress={table ? () => pos.closeMut.mutate(table.id) : undefined}
          info={table ? pos.tableVisuals.get(table.id) : undefined}
          onEncaisser={
            table
              ? () => {
                  onEncaisser(table);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
