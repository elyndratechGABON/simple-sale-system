import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { formatDay } from "@/lib/format";

export const ALL = "__all";
export const COUNTER = "__counter";

export const scopeLabel = (scope: string) =>
  scope === ALL ? "Toutes" : scope === COUNTER ? "Comptoir" : `Table ${scope}`;

export type Period = "day" | "week" | "month" | "year";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

export const bucketStart: Record<Period, (ts: number) => number> = {
  day: (ts) => startOfDay(ts).getTime(),
  week: (ts) => startOfWeek(ts, { weekStartsOn: 1 }).getTime(),
  month: (ts) => startOfMonth(ts).getTime(),
  year: (ts) => startOfYear(ts).getTime(),
};

export type Bucket = { start: number; total: number; count: number; profit: number };

export function bucketLabel(period: Period, start: number): string {
  switch (period) {
    case "day":
      return formatDay(start);
    case "week":
      return `Sem. du ${new Date(start).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      })}`;
    case "month":
      return new Date(start).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    case "year":
      return String(new Date(start).getFullYear());
  }
}
