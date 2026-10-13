import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFCFA, formatTime } from "@/lib/format";
import type { PosController } from "./usePos";

/**
 * L'addition déjà servie, tournée par tournée. Chaque tournée s'encaisse indépendamment :
 * « Encaisser cette tournée » la règle sans clore la table, qui reste ouverte pour la suite.
 */
export function PreviousRounds({ pos }: { pos: PosController }) {
  if (!pos.activeTable) return null;
  if (pos.rounds.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Table ouverte, rien de servi pour l'instant.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="max-h-56 space-y-3 overflow-auto rounded-lg border bg-muted/40 p-3">
        {pos.rounds.map(([orderedAt, items]) => {
          const roundTotal = items.reduce((s, it) => s + it.price_at_sale * it.quantity, 0);
          return (
            <div key={orderedAt} className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {orderedAt ? formatTime(orderedAt) : "Commande"}
                </span>
                <span className="text-sm font-bold tabular-nums">{formatFCFA(roundTotal)}</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between gap-2 text-sm">
                    <span className="truncate">
                      {it.quantity} × {it.name}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatFCFA(it.price_at_sale * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Masqué pendant l'encaissement : à ce moment-là on ne change plus de cible. */}
              {!pos.cashing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full gap-1"
                  onClick={() => pos.setCashing({ kind: "round", orderedAt })}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Encaisser cette tournée
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t pt-2">
        <span className="font-semibold">Addition</span>
        <span className="text-2xl font-bold text-primary tabular-nums">
          {formatFCFA(pos.activeTable.total)}
        </span>
      </div>
    </div>
  );
}
