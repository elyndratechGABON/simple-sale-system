import { n as CardContent, t as Card } from "./card-ChhSX-dj.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { eachDayOfInterval, startOfDay, subDays } from "date-fns";
//#region src/lib/analytics.ts
var lineRevenue = (i) => i.price_at_sale * i.quantity;
var lineProfit = (i) => (i.price_at_sale - (i.cost_at_sale ?? 0)) * i.quantity;
var lineCategory = (i) => i.category_at_sale ?? "Autre";
var dayKey = (ts) => startOfDay(ts).getTime();
/** Bornes [from, to[ des `days` derniers jours, aujourd'hui inclus. */
function lastDaysRange(days) {
	const today = startOfDay(/* @__PURE__ */ new Date());
	return {
		from: subDays(today, days - 1).getTime(),
		to: today.getTime() + 864e5
	};
}
function computePeriodStats(sales, items, from, to, expenses = []) {
	const inRange = sales.filter((s) => s.timestamp >= from && s.timestamp < to);
	const saleIds = new Set(inRange.map((s) => s.id));
	const inRangeItems = items.filter((i) => saleIds.has(i.sale_id));
	const saleDay = new Map(inRange.map((s) => [s.id, dayKey(s.timestamp)]));
	const inRangeExpenses = expenses.filter((e) => e.timestamp >= from && e.timestamp < to);
	const buckets = /* @__PURE__ */ new Map();
	for (const d of eachDayOfInterval({
		start: from,
		end: to - 1
	})) buckets.set(d.getTime(), {
		day: d.getTime(),
		revenue: 0,
		profit: 0,
		expenses: 0,
		netProfit: 0,
		salesCount: 0
	});
	for (const s of inRange) {
		const b = buckets.get(dayKey(s.timestamp));
		if (b) b.salesCount += 1;
	}
	let expensesTotal = 0;
	for (const e of inRangeExpenses) {
		expensesTotal += e.amount;
		const b = buckets.get(dayKey(e.timestamp));
		if (b) b.expenses += e.amount;
	}
	const categories = /* @__PURE__ */ new Map();
	let revenue = 0;
	let profit = 0;
	let itemsCount = 0;
	for (const item of inRangeItems) {
		const r = lineRevenue(item);
		const p = lineProfit(item);
		revenue += r;
		profit += p;
		itemsCount += item.quantity;
		const day = saleDay.get(item.sale_id);
		const bucket = day === void 0 ? void 0 : buckets.get(day);
		if (bucket) {
			bucket.revenue += r;
			bucket.profit += p;
		}
		const cat = lineCategory(item);
		const c = categories.get(cat);
		if (c) {
			c.revenue += r;
			c.profit += p;
		} else categories.set(cat, {
			category: cat,
			revenue: r,
			profit: p
		});
	}
	const days = Array.from(buckets.values()).sort((a, b) => a.day - b.day);
	for (const d of days) d.netProfit = d.profit - d.expenses;
	const sold = days.filter((d) => d.salesCount > 0);
	const active = days.filter((d) => d.salesCount > 0 || d.expenses > 0);
	const netProfit = profit - expensesTotal;
	return {
		revenue,
		profit,
		expenses: expensesTotal,
		netProfit,
		salesCount: inRange.length,
		itemsCount,
		customersCount: inRange.reduce((s, sale) => s + (sale.customers_count ?? 1), 0),
		marginRate: revenue > 0 ? profit / revenue : 0,
		netMarginRate: revenue > 0 ? netProfit / revenue : 0,
		averageBasket: inRange.length > 0 ? revenue / inRange.length : 0,
		bestDay: sold.reduce((a, d) => !a || d.revenue > a.revenue ? d : a, null),
		worstDay: active.reduce((a, d) => !a || d.netProfit < a.netProfit ? d : a, null),
		growthRate: computeGrowthRate(days),
		byCategory: Array.from(categories.values()).sort((a, b) => b.revenue - a.revenue),
		days
	};
}
/** Compare le chiffre d'affaires des deux moitiés de la période. Renvoie NaN quand la
*  comparaison n'a pas de sens : période d'un seul jour, ou 1re moitié sans vente. */
function computeGrowthRate(days) {
	if (days.length < 2) return NaN;
	const half = Math.floor(days.length / 2);
	const first = days.slice(0, half).reduce((s, d) => s + d.revenue, 0);
	const second = days.slice(days.length - half).reduce((s, d) => s + d.revenue, 0);
	if (first === 0) return NaN;
	return (second - first) / first;
}
//#endregion
//#region src/components/StatCard.tsx
function StatCard({ label, value, hint, highlight }) {
	return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
		className: "p-4",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "text-sm text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-1 text-2xl font-bold " + (highlight ? "text-primary" : "text-foreground"),
				children: value
			}),
			hint && /* @__PURE__ */ jsx("div", {
				className: "mt-1 text-xs text-muted-foreground",
				children: hint
			})
		]
	}) });
}
//#endregion
export { lineProfit as i, computePeriodStats as n, lastDaysRange as r, StatCard as t };
