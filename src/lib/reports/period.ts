// Calculs de période du calendrier de Comptabilité.
//
// Isolé de `reports.tsx` parce que ce sont des FONCTIONS PURES : elles se testent sans
// React, sans IndexedDB, sans navigateur. Elles étaient imbriquées dans un fichier de
// 1030 lignes où aucune ne pouvait l'être (le fichier ne rendait qu'un composant).

import {
  addDays,
  addMonths,
  addYears,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { formatDay, formatDayShort } from "@/lib/format";

/** Granularités de la page. `focusedDay` sert à la fois d'ancre de période et de
 *  jour sélectionné : naviguer change les deux, donc le détail suit toujours la vue. */
export type CalendarView = "month" | "week" | "day" | "year";

export const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mois" },
  { value: "week", label: "Semaine" },
  { value: "day", label: "Jour" },
  { value: "year", label: "Année" },
];

export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Libellé du premier KPI : dépend de la granularité, le reste est identique partout. */
export const REVENUE_LABEL: Record<CalendarView, string> = {
  month: "CA du mois",
  week: "CA semaine",
  day: "CA du jour",
  year: "CA annuel",
};

export const NAV_LABEL: Record<CalendarView, string> = {
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  year: "Année",
};

/** Minuit du lundi de la semaine (lundi) qui contient `ts`. */
export function startOfWeekMonday(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Décale l'ancre d'une période, sans jamais coder une date en dur. */
export function stepDay(ts: number, view: CalendarView, dir: 1 | -1): number {
  if (view === "month") return addMonths(ts, dir).getTime();
  if (view === "year") return addYears(ts, dir).getTime();
  if (view === "week") return addDays(ts, dir * 7).getTime();
  return addDays(ts, dir).getTime();
}

export function periodTitle(ts: number, view: CalendarView): string {
  if (view === "year") return String(new Date(ts).getFullYear());
  if (view === "week") {
    const mon = startOfWeekMonday(ts);
    return `${formatDayShort(mon)} – ${formatDayShort(mon + 6 * 86400000)}`;
  }
  if (view === "day") return formatDay(ts);
  const label = new Date(ts).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** La plage interrogée pour une vue. Les bornes sont exclusives à droite. */
export function rangeFor(
  focusedDay: number,
  view: CalendarView,
): {
  from: number;
  to: number;
} {
  if (view === "year") {
    const y = startOfYear(focusedDay).getTime();
    return { from: y, to: endOfYear(focusedDay).getTime() + 86400000 };
  }
  if (view === "week") {
    const mon = startOfWeekMonday(focusedDay);
    return { from: mon, to: mon + 7 * 86400000 };
  }
  if (view === "day") {
    const from = startOfDay(focusedDay).getTime();
    return { from, to: from + 86400000 };
  }
  const from = startOfMonth(focusedDay).getTime();
  return { from, to: addMonths(from, 1).getTime() };
}
