import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PERIODS, bucketLabel, scopeLabel, type Bucket, type Period } from "./history-period";

interface HistoryFiltersProps {
  scopes: string[];
  scope: string;
  onScope: (s: string) => void;
  hasSales: boolean;
  period: Period;
  onPeriod: (p: Period) => void;
  buckets: Bucket[];
  active: Bucket | null;
  onPick: (start: number) => void;
}

export function HistoryFilters({
  scopes,
  scope,
  onScope,
  hasSales,
  period,
  onPeriod,
  buckets,
  active,
  onPick,
}: HistoryFiltersProps) {
  return (
    <>
      {scopes.length > 2 && (
        <div className="flex flex-wrap gap-1">
          {scopes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onScope(s)}
              aria-pressed={scope === s}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm transition-colors",
                scope === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent",
              )}
            >
              {scopeLabel(s)}
            </button>
          ))}
        </div>
      )}

      {hasSales && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => onPeriod(p.key)}
                aria-pressed={period === p.key}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm transition-colors",
                  period === p.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {buckets.map((b) => (
              <button
                key={b.start}
                type="button"
                onClick={() => onPick(b.start)}
                aria-pressed={active?.start === b.start}
                className={cn(
                  "rounded-xl border bg-card p-3 text-left transition-all hover:border-primary active:scale-[0.98]",
                  active?.start === b.start && "border-primary ring-2 ring-primary ring-offset-1",
                )}
              >
                <div className="truncate text-sm font-semibold first-letter:uppercase">
                  {bucketLabel(period, b.start)}
                </div>
                {/* Montants insécables (U+00A0) : sans truncate, un bucket
                    semaine/mois au CA long déborde de sa demi-colonne. */}
                <div className="truncate text-lg font-bold tabular-nums text-primary">
                  {formatFCFA(b.total)}
                </div>
                <div className="text-xs font-medium tabular-nums text-emerald-600">
                  {formatFCFA(b.profit)} de bénéfice
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.count} vente{b.count > 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
