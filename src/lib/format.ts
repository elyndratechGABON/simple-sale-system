export function formatFCFA(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  const rounded = Math.round(value);
  const str = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${rounded < 0 ? "-" : ""}${str}\u00A0F`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Taux dans [0,1] → « 42,6 % ». `signed` préfixe le signe (taux de croissance). */
export function formatPercent(rate: number, signed = false): string {
  if (!Number.isFinite(rate)) return "—";
  const pct = rate * 100;
  const body = `${Math.abs(pct).toFixed(1).replace(".", ",")}\u00A0%`;
  if (!signed) return `${pct < 0 ? "-" : ""}${body}`;
  return `${pct < 0 ? "−" : "+"}${body}`;
}

/** Date courte pour un axe de graphique : « 29/07 ». */
export function formatDayShort(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/** Date complète pour une fiche d'abonnement : « 29/07/2026 ». */
export function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDay(ts: number): string {
  const day = new Date(ts).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  if (day === today) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return "Hier";
  return new Date(day).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
