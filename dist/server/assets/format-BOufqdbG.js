//#region src/lib/format.ts
function formatFCFA(value) {
	if (!Number.isFinite(value)) return "∞";
	const rounded = Math.round(value);
	const str = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\xA0");
	return `${rounded < 0 ? "-" : ""}${str}\u00A0F`;
}
function formatTime(ts) {
	return new Date(ts).toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit"
	});
}
/** Taux dans [0,1] → « 42,6 % ». `signed` préfixe le signe (taux de croissance). */
function formatPercent(rate, signed = false) {
	if (!Number.isFinite(rate)) return "—";
	const pct = rate * 100;
	const body = `${Math.abs(pct).toFixed(1).replace(".", ",")}\u00A0%`;
	if (!signed) return `${pct < 0 ? "-" : ""}${body}`;
	return `${pct < 0 ? "−" : "+"}${body}`;
}
/** Date courte pour un axe de graphique : « 29/07 ». */
function formatDayShort(ts) {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit"
	});
}
function formatDay(ts) {
	const day = new Date(ts).setHours(0, 0, 0, 0);
	const today = (/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0);
	if (day === today) return "Aujourd'hui";
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (day === yesterday.getTime()) return "Hier";
	return new Date(day).toLocaleDateString("fr-FR", {
		weekday: "long",
		day: "2-digit",
		month: "long",
		year: "numeric"
	});
}
//#endregion
export { formatTime as a, formatPercent as i, formatDayShort as n, formatFCFA as r, formatDay as t };
