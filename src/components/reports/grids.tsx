// Les 7 jours de la semaine, une colonne chacun, CA réel sous la date.
// Et les 12 mois de l'année, chacun cliquable vers la vue Mois correspondante.

import { startOfDay } from "date-fns";
import type { DayBucket } from "@/lib/analytics";
import { formatFCFACompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { WEEKDAYS } from "@/lib/reports/period";

export function WeekStrip({
  weekStart,
  days,
  selected,
  onSelect,
}: {
  weekStart: number;
  days: Map<number, DayBucket>;
  selected: number;
  onSelect: (ts: number) => void;
}) {
  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => {
            // `startOfDay` sur chaque cellule : l'ancre est déjà un lundi à minuit, donc c'est
            // neutre ici — mais la ligne est reprise telle quelle de l'original, sans « simplifier ».
            const ts = startOfDay(weekStart + i * 86400000).getTime();
            const bucket = days.get(ts);
            const revenue = bucket?.revenue ?? 0;
            const isSel = ts === selected;
            return (
              <button
                key={ts}
                onClick={() => onSelect(ts)}
                aria-pressed={isSel}
                className={cn(
                  "flex min-h-[86px] flex-col items-center gap-1 rounded-xl border p-1.5 transition-colors",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : revenue > 0
                      ? "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                      : "border-transparent bg-muted/40",
                )}
              >
                <span className="text-[10px] uppercase leading-none opacity-70">{w}</span>
                <span className="text-sm font-semibold leading-none tabular-nums">
                  {new Date(ts).getDate()}
                </span>
                <span
                  className={cn(
                    "mt-auto truncate text-[10px] leading-none tabular-nums",
                    isSel
                      ? "text-primary-foreground"
                      : revenue > 0
                        ? "font-semibold text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {revenue > 0 ? formatFCFACompact(revenue) : "—"}
                </span>
                <span
                  className={cn(
                    "text-[9px] leading-none tabular-nums",
                    isSel ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {bucket && bucket.salesCount > 0 ? `${bucket.salesCount} v.` : " "}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function YearGrid({
  months,
  selectedMonth,
  onSelect,
}: {
  months: { label: string; month: number; revenue: number; salesCount: number }[];
  selectedMonth: number;
  onSelect: (month: number) => void;
}) {
  const max = months.reduce((m, x) => Math.max(m, x.revenue), 0);
  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {months.map((m) => {
            const ratio = max > 0 ? m.revenue / max : 0;
            return (
              <button
                key={m.label}
                onClick={() => onSelect(m.month)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-2 text-left transition-colors",
                  m.month === selectedMonth
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/50",
                )}
              >
                <span className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-xs font-medium">{m.label}</span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px] font-semibold tabular-nums",
                      m.month === selectedMonth ? "text-primary-foreground" : "text-primary",
                    )}
                  >
                    {m.revenue > 0 ? formatFCFACompact(m.revenue) : "—"}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 w-full overflow-hidden rounded-full",
                    m.month === selectedMonth ? "bg-primary-foreground/30" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      m.month === selectedMonth ? "bg-primary-foreground" : "bg-primary",
                    )}
                    style={{ width: `${Math.round(ratio * 100)}%`, opacity: 0.4 + ratio * 0.6 }}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    m.month === selectedMonth
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {m.salesCount > 0 ? `${m.salesCount} ventes` : "aucune vente"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Touchez un mois pour ouvrir son calendrier détaillé.
        </p>
      </CardContent>
    </Card>
  );
}
