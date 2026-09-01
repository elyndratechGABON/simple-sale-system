export function formatFCFA(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  const rounded = Math.round(value);
  const str = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${rounded < 0 ? "-" : ""}${str}\u00A0F`;
}

/** Montant ultra-court pour une cellule de calendrier : « 950 », « 1,5k » (FCFA). */
export function formatFCFACompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 1000) return String(Math.round(value));
  const k = value / 1000;
  const body = k >= 100 ? String(Math.round(k)) : k.toFixed(1).replace(".", ",");
  return `${body}k`;
}

/** Poids affiché (boucherie) : 2 chiffres après la virgule, sans décimales inutiles,
 *  suivi de « kg ». */
export function formatKg(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 100) return `${Math.round(value).toString()} kg`;
  return `${value.toFixed(2).replace(".", ",")} kg`;
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

/** Temps relatif court pour un fil d'activité : « à l'instant », « il y a 5 min »… */
export function formatRelative(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  return `il y a ${days} j`;
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
