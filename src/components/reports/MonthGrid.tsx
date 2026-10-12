// Grille du mois. Chaque cellule porte le montant RÉEL du jour (`days` vient de
// `computePeriodStats`), une barre proportionnelle au meilleur jour du mois et un
// point d'activité. Les jours voisins du mois sont des cases vides et non cliquables :
// leur montant n'est pas dans la requête, donc on ne l'invente pas (§22).

import { useMemo } from "react";
import { startOfDay } from "date-fns";
import type { AssetReminder, DayBucket } from "@/lib/analytics";
import { dayKey } from "@/lib/analytics";
import { formatDay, formatFCFA, formatFCFACompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { WEEKDAYS } from "@/lib/reports/period";

export function MonthGrid({
  month,
  days,
  assetEvents,
  selected,
  onSelect,
}: {
  month: number;
  days: Map<number, DayBucket>;
  assetEvents: Map<number, AssetReminder[]>;
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
            const asset = assetEvents.get(ts);
            const retours = asset?.filter((r) => r.kind === "retour").length ?? 0;
            const rappels = asset?.filter((r) => r.kind === "rappel").length ?? 0;
            const overdue = (retours > 0 || rappels > 0) && ts < dayKey(Date.now());
            // Un libellé parlant : la pastille ne se résume pas à une couleur.
            const assetLabel = [
              retours > 0 && (retours > 1 ? `${retours} retours d'actifs` : "1 retour d'actif"),
              rappels > 0 && (rappels > 1 ? `${rappels} rappels` : "1 rappel"),
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={ts}
                onClick={() => onSelect(ts)}
                aria-pressed={isSel}
                aria-label={`${formatDay(ts)} — ${revenue > 0 ? formatFCFA(revenue) : "aucune vente"}${assetLabel ? ` — ${assetLabel}${overdue ? ", en retard" : ""}` : ""}`}
                className={cn(
                  "flex h-[58px] flex-col justify-between rounded-xl border p-1 text-left transition-colors sm:h-16 sm:p-1.5",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : revenue > 0
                      ? "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                      : "border-transparent bg-muted/40",
                  hot && !isSel && "ring-1 ring-primary/25",
                  overdue && !isSel && "border-destructive/60 bg-destructive/5",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-medium leading-none tabular-nums">
                    {new Date(ts).getDate()}
                  </span>
                  {/* Deux pastilles distinctes : le CA (vert, ou l'inverse
                      quand le jour est sélectionné) et l'échéance actif. Les
                      confondre en une seule pastille ferait disparaître le CA
                      d'un jour d'échéance — l'information la moins visible
                      disparaîtrait, ce qui est l'inverse de l'usage d'un
                      calendrier. */}
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
                    {(retours > 0 || rappels > 0) && (
                      <span
                        aria-hidden
                        title={assetLabel}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isSel
                            ? "bg-primary-foreground"
                            : overdue
                              ? "bg-destructive"
                              : "bg-amber-500",
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
