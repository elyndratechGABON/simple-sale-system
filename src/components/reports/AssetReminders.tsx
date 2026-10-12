// Échéances des actifs : retours de location et rappels que le propriétaire
// s'est fixés. La liste est triée par date, donc un retard remonte tout seul ;
// le clic déplace le calendrier sur le jour concerné, ce qui évite d'expliquer
// deux fois la même chose (marqueur sur la case + ligne dans la liste).

import { BellRing, PackageCheck } from "lucide-react";
import type { AssetReminder } from "@/lib/analytics";
import { dayKey } from "@/lib/analytics";
import { formatDayShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function AssetReminders({
  rows,
  onSelect,
}: {
  rows: AssetReminder[];
  onSelect: (ts: number) => void;
}) {
  const today = dayKey(Date.now());
  return (
    <Card>
      <CardContent className="space-y-2 p-3 sm:p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PackageCheck className="h-4 w-4 text-primary" />
          Retours d'actifs
          <span className="text-xs font-normal text-muted-foreground">
            {rows.length > 0 ? `${rows.length} à venir` : ""}
          </span>
        </p>
        <ul className="space-y-1.5">
          {rows.map(({ product, at, kind }) => {
            const late = at < today;
            const days = Math.round((at - today) / 86400000);
            return (
              <li key={`${product.id}-${kind}`}>
                <button
                  onClick={() => onSelect(at)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
                >
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      kind === "retour"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {kind === "retour" ? "Retour" : "Rappel"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                  {late ? (
                    <span className="shrink-0 text-xs font-medium text-destructive">
                      {days === 0 ? "aujourd'hui" : `${-days} j de retard`}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDayShort(at)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BellRing className="h-3 w-3 shrink-0" />
          La pastille ambre marque l'échéance sur le calendrier ; rouge, elle est en retard.
        </p>
      </CardContent>
    </Card>
  );
}
