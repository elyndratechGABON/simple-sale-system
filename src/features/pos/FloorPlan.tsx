import { Plus, Store, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCard, TargetChip } from "@/components/pos";
import type { PosController } from "./usePos";

/**
 * Plan de salle. Toutes les tables sont là, occupées ou non, TOUJOURS à la même place :
 * c'est ce qui permet de lire l'état du service d'un coup d'œil. Un tap sur une table
 * libre l'ouvre, un appui long sur une table occupée la libère. Masqué pour un commerce
 * sans système de tables (snack/bar).
 */
export function FloorPlan({ pos }: { pos: PosController }) {
  if (!pos.hasTables) return null;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
        {pos.floorPlan.map(({ label, table }) => (
          <TableCard
            key={label}
            label={label}
            table={table}
            active={pos.activeTable?.table === label}
            disabled={pos.openMut.isPending || pos.closeMut.isPending}
            onClick={() =>
              table
                ? pos.selectTarget({ kind: "table", saleId: table.id })
                : pos.openMut.mutate(label)
            }
            onLongPress={table ? () => pos.closeMut.mutate(table.id) : undefined}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TargetChip
          active={pos.activeTable === null}
          onClick={() => pos.selectTarget({ kind: "direct" })}
          icon={Store}
          label="Comptoir"
        />
        <Button variant="outline" className="h-11" onClick={pos.addTable}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle table
        </Button>
      </div>
      {/* Légende simplifiée : libre / occupée */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-border" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Occupée
        </span>
      </div>
      {/* Le geste est invisible sans ce rappel, et il n'existe qu'une fois qu'une table
          est occupée : afficher la phrase en permanence apprendrait un geste inutile. */}
      {pos.openTables.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Appui long sur une table occupée pour la libérer.
        </p>
      )}
      {pos.openTables.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => pos.setOrdersOpen(true)}
        >
          <Utensils className="h-4 w-4" />
          Commandes en cours
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
            {pos.openTables.length}
          </span>
        </Button>
      )}
    </div>
  );
}
