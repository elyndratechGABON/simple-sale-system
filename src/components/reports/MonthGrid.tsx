// Grille du mois. Chaque cellule porte le montant RÉEL du jour (`days` vient de
// `computePeriodStats`), une barre proportionnelle au meilleur jour du mois et un
// point d'activité. Les jours voisins du mois sont des cases vides et non cliquables :
// leur montant n'est pas dans la requête, donc on ne l'invente pas (§22).

import { useMemo } from "react";
import { startOfDay } from "date-fns";
import type { DayBucket } from "@/lib/analytics";
import { formatDay, formatFCFA, formatFCFACompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { WEEKDAYS } from "@/lib/reports/period";

export function MonthGrid({
  month,
  days,
  selected,
  onSelect,
}: {
  month: number;
  days: Map<number, DayBucket>;
  selected: number;
  onSelect: (ts: number) => void;
}) {
  const first = new Date(month);
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const max = useMemo(() => {
    let m = 0;
    for (const d of days.values()) if (d.revenue > m) m = d.revenue;
    return m;
  }, [days]);

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) =>
      startOfDay(new Date(month + i * 86400000)).getTime(),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((ts, i) => {
            if (ts === null) return <div key={`e${i}`} aria-hidden className="h-[58px] sm:h-16" />;
            const bucket = days.get(ts);
            const revenue = bucket?.revenue ?? 0;
            const isSel = ts === selected;
            const ratio = max > 0 ? revenue / max : 0;
            const hot = ratio > 0.75;
            return (
              <button
                key={ts}
                onClick={() => onSelect(ts)}
                aria-pressed={isSel}
                aria-label={`${formatDay(ts)} — ${revenue > 0 ? formatFCFA(revenue) : "aucune vente"}`}
                className={cn(
                  "flex h-[58px] flex-col justify-between rounded-xl border p-1 text-left transition-colors sm:h-16 sm:p-1.5",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : revenue > 0
                      ? "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                      : "border-transparent bg-muted/40",
                  hot && !isSel && "ring-1 ring-primary/25",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-medium leading-none tabular-nums">
                    {new Date(ts).getDate()}
                  </span>
                  {/* Pastille de CA : verte, ou l'inverse quand le jour est
                      sélectionné. */}
                  <span className="flex items-center gap-0.5">
                    {revenue > 0 && (
                      <span
                        aria-hidden
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isSel ? "bg-primary-foreground" : "bg-primary",
                        )}
                      />
                    )}
                  </span>
                </div>
                <span
                  className={cn(
                    "truncate text-[10px] leading-none tabular-nums sm:text-[11px]",
                    isSel
                      ? "text-primary-foreground/90"
                      : revenue > 0
                        ? "font-semibold text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {revenue > 0 ? formatFCFACompact(revenue) : "—"}
                </span>
                {/* Barre d'intensité : verte, proportionnelle au CA réel. */}
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 w-full overflow-hidden rounded-full",
                    isSel ? "bg-primary-foreground/30" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      isSel ? "bg-primary-foreground" : "bg-primary",
                    )}
                    style={{ width: `${Math.round(ratio * 100)}%`, opacity: 0.4 + ratio * 0.6 }}
                  />
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Touchez un jour pour voir son détail.
        </p>
      </CardContent>
    </Card>
  );
}
