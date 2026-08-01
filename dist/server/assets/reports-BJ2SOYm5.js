import { i as getDocumentsDirectoryName, n as describeSaveResult, o as saveDocument, s as usePreferences } from "./files-4u0jemrE.js";
import { C as cn, S as buttonVariants, f as getSaleItemsForSales, g as listSales, m as listExpenses, o as closeDay, x as Button, y as startOfToday } from "./db-WliOSm7d.js";
import { a as formatTime, i as formatPercent, n as formatDayShort, r as formatFCFA, t as formatDay } from "./format-BOufqdbG.js";
import { i as lineProfit, n as computePeriodStats, r as lastDaysRange, t as StatCard } from "./StatCard-CfCcfEaM.js";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-ChhSX-dj.js";
import * as React from "react";
import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarDays, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, Download, FileSpreadsheet, FileText, Lock } from "lucide-react";
import { toast } from "sonner";
import * as RechartsPrimitive from "recharts";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import writeXlsxFile from "write-excel-file/browser";
//#region src/hooks/use-period-data.ts
/**
* Ventes, lignes de vente et dépenses d'un intervalle [from, to[, en requêtes indexées.
*
* La clé garde le préfixe ["sales"] : les mutations existantes (validation d'une vente,
* annulation, clôture, ajout de dépense) invalident déjà ce préfixe, rien à câbler en
* plus. Les dépenses voyagent avec les ventes plutôt que dans leur propre query parce
* qu'aucun écran n'affiche un bénéfice net sans avoir aussi besoin des revenus.
*/
function usePeriodData(from, to) {
	return useQuery({
		queryKey: [
			"sales",
			"range",
			from,
			to
		],
		queryFn: async () => {
			const [sales, expenses] = await Promise.all([listSales(from, to), listExpenses(from, to)]);
			return {
				sales,
				items: await getSaleItemsForSales(sales.map((s) => s.id)),
				expenses
			};
		}
	});
}
//#endregion
//#region src/components/ui/calendar.tsx
function Calendar({ className, classNames, showOutsideDays = true, captionLayout = "label", buttonVariant = "ghost", formatters, components, ...props }) {
	const defaultClassNames = getDefaultClassNames();
	return /* @__PURE__ */ jsx(DayPicker, {
		showOutsideDays,
		className: cn("bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent", String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`, String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`, className),
		captionLayout,
		formatters: {
			formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
			...formatters
		},
		classNames: {
			root: cn("w-fit", defaultClassNames.root),
			months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
			month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
			nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
			button_previous: cn(buttonVariants({ variant: buttonVariant }), "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50", defaultClassNames.button_previous),
			button_next: cn(buttonVariants({ variant: buttonVariant }), "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50", defaultClassNames.button_next),
			month_caption: cn("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)", defaultClassNames.month_caption),
			dropdowns: cn("flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium", defaultClassNames.dropdowns),
			dropdown_root: cn("has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border", defaultClassNames.dropdown_root),
			dropdown: cn("bg-popover absolute inset-0 opacity-0", defaultClassNames.dropdown),
			caption_label: cn("select-none font-medium", captionLayout === "label" ? "text-sm" : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5", defaultClassNames.caption_label),
			table: "w-full border-collapse",
			weekdays: cn("flex", defaultClassNames.weekdays),
			weekday: cn("text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal", defaultClassNames.weekday),
			week: cn("mt-2 flex w-full", defaultClassNames.week),
			week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
			week_number: cn("text-muted-foreground select-none text-[0.8rem]", defaultClassNames.week_number),
			day: cn("group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md", defaultClassNames.day),
			range_start: cn("bg-accent rounded-l-md", defaultClassNames.range_start),
			range_middle: cn("rounded-none", defaultClassNames.range_middle),
			range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
			today: cn("bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none", defaultClassNames.today),
			outside: cn("text-muted-foreground aria-selected:text-muted-foreground", defaultClassNames.outside),
			disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
			hidden: cn("invisible", defaultClassNames.hidden),
			...classNames
		},
		components: {
			Root: ({ className, rootRef, ...props }) => {
				return /* @__PURE__ */ jsx("div", {
					"data-slot": "calendar",
					ref: rootRef,
					className: cn(className),
					...props
				});
			},
			Chevron: ({ className, orientation, ...props }) => {
				if (orientation === "left") return /* @__PURE__ */ jsx(ChevronLeftIcon, {
					className: cn("size-4", className),
					...props
				});
				if (orientation === "right") return /* @__PURE__ */ jsx(ChevronRightIcon, {
					className: cn("size-4", className),
					...props
				});
				return /* @__PURE__ */ jsx(ChevronDownIcon, {
					className: cn("size-4", className),
					...props
				});
			},
			DayButton: CalendarDayButton,
			WeekNumber: ({ children, ...props }) => {
				return /* @__PURE__ */ jsx("td", {
					...props,
					children: /* @__PURE__ */ jsx("div", {
						className: "flex size-(--cell-size) items-center justify-center text-center",
						children
					})
				});
			},
			...components
		},
		...props
	});
}
function CalendarDayButton({ className, day, modifiers, ...props }) {
	const defaultClassNames = getDefaultClassNames();
	const ref = React.useRef(null);
	React.useEffect(() => {
		if (modifiers.focused) ref.current?.focus();
	}, [modifiers.focused]);
	return /* @__PURE__ */ jsx(Button, {
		ref,
		variant: "ghost",
		size: "icon",
		"data-day": day.date.toLocaleDateString(),
		"data-selected-single": modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle,
		"data-range-start": modifiers.range_start,
		"data-range-end": modifiers.range_end,
		"data-range-middle": modifiers.range_middle,
		className: cn("data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-(--cell-size) flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70", defaultClassNames.day, className),
		...props
	});
}
//#endregion
//#region src/components/ui/popover.tsx
var Popover = PopoverPrimitive.Root;
var PopoverTrigger = PopoverPrimitive.Trigger;
var PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(PopoverPrimitive.Content, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
//#endregion
//#region src/components/ui/tabs.tsx
var Tabs = TabsPrimitive.Root;
var TabsList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(TabsPrimitive.List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = TabsPrimitive.List.displayName;
var TabsTrigger = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(TabsPrimitive.Trigger, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className),
	...props
}));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
var TabsContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(TabsPrimitive.Content, {
	ref,
	className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
	...props
}));
TabsContent.displayName = TabsPrimitive.Content.displayName;
//#endregion
//#region src/components/ui/chart.tsx
var THEMES = {
	light: "",
	dark: ".dark"
};
var ChartContext = React.createContext(null);
function useChart() {
	const context = React.useContext(ChartContext);
	if (!context) throw new Error("useChart must be used within a <ChartContainer />");
	return context;
}
var ChartContainer = React.forwardRef(({ id, className, children, config, ...props }, ref) => {
	const uniqueId = React.useId();
	const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
	return /* @__PURE__ */ jsx(ChartContext.Provider, {
		value: { config },
		children: /* @__PURE__ */ jsxs("div", {
			"data-chart": chartId,
			ref,
			className: cn("flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none", className),
			...props,
			children: [/* @__PURE__ */ jsx(ChartStyle, {
				id: chartId,
				config
			}), /* @__PURE__ */ jsx(RechartsPrimitive.ResponsiveContainer, { children })]
		})
	});
});
ChartContainer.displayName = "Chart";
var ChartStyle = ({ id, config }) => {
	const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);
	if (!colorConfig.length) return null;
	return /* @__PURE__ */ jsx("style", { dangerouslySetInnerHTML: { __html: Object.entries(THEMES).map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, itemConfig]) => {
		const color = itemConfig.theme?.[theme] || itemConfig.color;
		return color ? `  --color-${key}: ${color};` : null;
	}).join("\n")}
}
`).join("\n") } });
};
var ChartTooltip = RechartsPrimitive.Tooltip;
var ChartTooltipContent = React.forwardRef(({ active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey }, ref) => {
	const { config } = useChart();
	const tooltipLabel = React.useMemo(() => {
		if (hideLabel || !payload?.length) return null;
		const [item] = payload;
		const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
		const itemConfig = getPayloadConfigFromPayload(config, item, key);
		const value = !labelKey && typeof label === "string" ? config[label]?.label || label : itemConfig?.label;
		if (labelFormatter) return /* @__PURE__ */ jsx("div", {
			className: cn("font-medium", labelClassName),
			children: labelFormatter(value, payload)
		});
		if (!value) return null;
		return /* @__PURE__ */ jsx("div", {
			className: cn("font-medium", labelClassName),
			children: value
		});
	}, [
		label,
		labelFormatter,
		payload,
		hideLabel,
		labelClassName,
		config,
		labelKey
	]);
	if (!active || !payload?.length) return null;
	const nestLabel = payload.length === 1 && indicator !== "dot";
	return /* @__PURE__ */ jsxs("div", {
		ref,
		className: cn("grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl", className),
		children: [!nestLabel ? tooltipLabel : null, /* @__PURE__ */ jsx("div", {
			className: "grid gap-1.5",
			children: payload.filter((item) => item.type !== "none").map((item, index) => {
				const key = `${nameKey || item.name || item.dataKey || "value"}`;
				const itemConfig = getPayloadConfigFromPayload(config, item, key);
				const indicatorColor = color || item.payload.fill || item.color;
				return /* @__PURE__ */ jsx("div", {
					className: cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center"),
					children: formatter && item?.value !== void 0 && item.name ? formatter(item.value, item.name, item, index, item.payload) : /* @__PURE__ */ jsxs(Fragment, { children: [itemConfig?.icon ? /* @__PURE__ */ jsx(itemConfig.icon, {}) : !hideIndicator && /* @__PURE__ */ jsx("div", {
						className: cn("shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)", {
							"h-2.5 w-2.5": indicator === "dot",
							"w-1": indicator === "line",
							"w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
							"my-0.5": nestLabel && indicator === "dashed"
						}),
						style: {
							"--color-bg": indicatorColor,
							"--color-border": indicatorColor
						}
					}), /* @__PURE__ */ jsxs("div", {
						className: cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center"),
						children: [/* @__PURE__ */ jsxs("div", {
							className: "grid gap-1.5",
							children: [nestLabel ? tooltipLabel : null, /* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground",
								children: itemConfig?.label || item.name
							})]
						}), item.value && /* @__PURE__ */ jsx("span", {
							className: "font-mono font-medium tabular-nums text-foreground",
							children: item.value.toLocaleString()
						})]
					})] })
				}, item.dataKey);
			})
		})]
	});
});
ChartTooltipContent.displayName = "ChartTooltip";
var ChartLegendContent = React.forwardRef(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
	const { config } = useChart();
	if (!payload?.length) return null;
	return /* @__PURE__ */ jsx("div", {
		ref,
		className: cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className),
		children: payload.filter((item) => item.type !== "none").map((item) => {
			const key = `${nameKey || item.dataKey || "value"}`;
			const itemConfig = getPayloadConfigFromPayload(config, item, key);
			return /* @__PURE__ */ jsxs("div", {
				className: cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"),
				children: [itemConfig?.icon && !hideIcon ? /* @__PURE__ */ jsx(itemConfig.icon, {}) : /* @__PURE__ */ jsx("div", {
					className: "h-2 w-2 shrink-0 rounded-[2px]",
					style: { backgroundColor: item.color }
				}), itemConfig?.label]
			}, item.value);
		})
	});
});
ChartLegendContent.displayName = "ChartLegend";
function getPayloadConfigFromPayload(config, payload, key) {
	if (typeof payload !== "object" || payload === null) return;
	const payloadPayload = "payload" in payload && typeof payload.payload === "object" && payload.payload !== null ? payload.payload : void 0;
	let configLabelKey = key;
	if (key in payload && typeof payload[key] === "string") configLabelKey = payload[key];
	else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === "string") configLabelKey = payloadPayload[key];
	return configLabelKey in config ? config[configLabelKey] : config[key];
}
//#endregion
//#region src/lib/exports/report.ts
function isoLocal(ts) {
	const d = new Date(ts);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** `rapport-2026-07-26_2026-08-01.pdf` — bornes incluses, `to` étant exclusif. */
function reportFilename(payload, extension) {
	return `rapport-${isoLocal(payload.from)}_${isoLocal(payload.to - 1)}.${extension}`;
}
function itemsBySale(payload) {
	const map = /* @__PURE__ */ new Map();
	for (const item of payload.items) {
		const bucket = map.get(item.sale_id);
		if (bucket) bucket.push(item);
		else map.set(item.sale_id, [item]);
	}
	return map;
}
//#endregion
//#region src/lib/exports/csv.ts
var SEP = ";";
var BOM = String.fromCharCode(65279);
var escape = (value) => value.includes(SEP) ? `"${value.replace(/"/g, "\"\"")}"` : value;
function buildCsvBlob(payload) {
	const byId = itemsBySale(payload);
	const rows = [[
		"type",
		"date",
		"heure",
		"libelle",
		"total",
		"donne",
		"rendu",
		"benefice",
		"clients"
	].join(SEP)];
	const rowsByTime = [];
	for (const sale of payload.sales) {
		const items = byId.get(sale.id) ?? [];
		const profit = items.reduce((sum, i) => sum + lineProfit(i), 0);
		rowsByTime.push({
			timestamp: sale.timestamp,
			cells: [
				"vente",
				new Date(sale.timestamp).toLocaleDateString("fr-FR"),
				formatTime(sale.timestamp),
				escape(items.map((i) => `${i.quantity}x ${i.name}`).join(" | ")),
				String(sale.total),
				String(sale.cash_given),
				String(sale.change_due),
				String(profit),
				String(sale.customers_count ?? 1)
			]
		});
	}
	for (const expense of payload.expenses) rowsByTime.push({
		timestamp: expense.timestamp,
		cells: [
			"depense",
			new Date(expense.timestamp).toLocaleDateString("fr-FR"),
			formatTime(expense.timestamp),
			escape(`${expense.category} — ${expense.label}`),
			String(-expense.amount),
			"",
			"",
			String(-expense.amount),
			""
		]
	});
	for (const row of rowsByTime.sort((a, b) => a.timestamp - b.timestamp)) rows.push(row.cells.join(SEP));
	return new Blob([BOM + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
}
//#endregion
//#region src/lib/exports/pdf.ts
var pdfText = (value) => value.replace(/\u00a0/g, " ");
var money$1 = (value) => pdfText(formatFCFA(value));
/**
* Capture un graphique recharts en PNG pour l'insérer dans le PDF.
* recharts rend du SVG : il faut le sérialiser puis le peindre dans un canvas, car
* jsPDF n'avale que des images matricielles.
* Renvoie null si la capture échoue — le PDF reste valide, sans l'illustration.
*/
async function captureChartPng(container) {
	const svg = container?.querySelector("svg");
	if (!svg) return null;
	try {
		const clone = svg.cloneNode(true);
		const { width, height } = svg.getBoundingClientRect();
		clone.setAttribute("width", String(width));
		clone.setAttribute("height", String(height));
		const source = new XMLSerializer().serializeToString(clone);
		const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
		const image = await new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = url;
		});
		const canvas = document.createElement("canvas");
		const scale = 2;
		canvas.width = width * scale;
		canvas.height = height * scale;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL("image/png");
	} catch {
		return null;
	}
}
function buildPdfBlob(payload, chartPng) {
	const { stats } = payload;
	const doc = new jsPDF({
		unit: "pt",
		format: "a4"
	});
	const margin = 40;
	let y = margin;
	doc.setFontSize(18);
	doc.text(pdfText(payload.workspaceName || "Rapport de ventes"), margin, y);
	y += 20;
	doc.setFontSize(10);
	doc.setTextColor(110);
	doc.text(pdfText(`${payload.label} · du ${formatDayShort(payload.from)} au ${formatDayShort(payload.to - 1)}`), margin, y);
	doc.setTextColor(0);
	y += 24;
	autoTable(doc, {
		startY: y,
		head: [["Indicateur", "Valeur"]],
		body: [
			["Revenus", money$1(stats.revenue)],
			["Bénéfice brut", money$1(stats.profit)],
			["Dépenses", money$1(stats.expenses)],
			["Bénéfice net", money$1(stats.netProfit)],
			["Ventes", String(stats.salesCount)],
			["Clients", String(stats.customersCount)],
			["Articles vendus", String(stats.itemsCount)],
			["Marge brute", formatPercent(stats.marginRate)],
			["Marge nette", formatPercent(stats.netMarginRate)],
			["Panier moyen", money$1(stats.averageBasket)],
			["Taux de croissance", formatPercent(stats.growthRate, true)],
			["Meilleur jour", stats.bestDay ? `${formatDayShort(stats.bestDay.day)} — ${money$1(stats.bestDay.revenue)}` : "—"],
			["Jour le moins rentable", stats.worstDay ? `${formatDayShort(stats.worstDay.day)} — ${money$1(stats.worstDay.netProfit)} net` : "—"]
		],
		theme: "striped",
		headStyles: { fillColor: [
			22,
			128,
			84
		] },
		margin: {
			left: margin,
			right: margin
		}
	});
	y = doc.lastAutoTable.finalY + 24;
	if (chartPng) {
		const width = doc.internal.pageSize.getWidth() - margin * 2;
		const height = width / 3;
		doc.addImage(chartPng, "PNG", margin, y, width, height, void 0, "FAST");
		y += height + 24;
	}
	autoTable(doc, {
		startY: y,
		head: [[
			"Jour",
			"Revenus",
			"Brut",
			"Dépenses",
			"Net",
			"Ventes"
		]],
		body: stats.days.map((d) => [
			formatDayShort(d.day),
			money$1(d.revenue),
			money$1(d.profit),
			money$1(d.expenses),
			money$1(d.netProfit),
			String(d.salesCount)
		]),
		theme: "grid",
		headStyles: { fillColor: [
			22,
			128,
			84
		] },
		margin: {
			left: margin,
			right: margin
		}
	});
	y = doc.lastAutoTable.finalY + 24;
	if (payload.expenses.length > 0) {
		autoTable(doc, {
			startY: y,
			head: [[
				"Date",
				"Catégorie",
				"Libellé",
				"Montant"
			]],
			body: [...payload.expenses].sort((a, b) => a.timestamp - b.timestamp).map((e) => [
				formatDayShort(e.timestamp),
				e.category,
				e.label,
				money$1(e.amount)
			]),
			theme: "grid",
			headStyles: { fillColor: [
				22,
				128,
				84
			] },
			margin: {
				left: margin,
				right: margin
			}
		});
		y = doc.lastAutoTable.finalY + 24;
	}
	autoTable(doc, {
		startY: y,
		head: [[
			"Catégorie",
			"Revenus",
			"Bénéfices",
			"Part"
		]],
		body: stats.byCategory.map((c) => [
			c.category,
			money$1(c.revenue),
			money$1(c.profit),
			formatPercent(stats.revenue > 0 ? c.revenue / stats.revenue : 0)
		]),
		theme: "grid",
		headStyles: { fillColor: [
			22,
			128,
			84
		] },
		margin: {
			left: margin,
			right: margin
		}
	});
	return doc.output("blob");
}
var pdfFilename = (payload) => reportFilename(payload, "pdf");
//#endregion
//#region src/lib/exports/xlsx.ts
var header = (...labels) => labels.map((value) => ({
	value,
	fontWeight: "bold"
}));
var money = (value) => ({
	value: Math.round(value),
	type: Number,
	format: "# ##0"
});
async function buildXlsxBlob(payload) {
	const { stats } = payload;
	const byId = itemsBySale(payload);
	const resume = [
		header("Indicateur", "Valeur"),
		...payload.workspaceName ? [[{
			value: "Commerce",
			type: String
		}, {
			value: payload.workspaceName,
			type: String
		}]] : [],
		[{
			value: "Période",
			type: String
		}, {
			value: payload.label,
			type: String
		}],
		[{
			value: "Revenus",
			type: String
		}, money(stats.revenue)],
		[{
			value: "Bénéfice brut",
			type: String
		}, money(stats.profit)],
		[{
			value: "Dépenses",
			type: String
		}, money(stats.expenses)],
		[{
			value: "Bénéfice net",
			type: String
		}, money(stats.netProfit)],
		[{
			value: "Ventes",
			type: String
		}, {
			value: stats.salesCount,
			type: Number
		}],
		[{
			value: "Clients",
			type: String
		}, {
			value: stats.customersCount,
			type: Number
		}],
		[{
			value: "Articles vendus",
			type: String
		}, {
			value: stats.itemsCount,
			type: Number
		}],
		[{
			value: "Marge brute",
			type: String
		}, {
			value: stats.marginRate,
			type: Number,
			format: "0.0%"
		}],
		[{
			value: "Marge nette",
			type: String
		}, {
			value: stats.netMarginRate,
			type: Number,
			format: "0.0%"
		}],
		[{
			value: "Panier moyen",
			type: String
		}, money(stats.averageBasket)],
		[{
			value: "Taux de croissance",
			type: String
		}, {
			value: stats.growthRate,
			type: Number,
			format: "+0.0%;-0.0%"
		}]
	];
	const ventes = [header("Date", "Heure", "Total", "Donné", "Rendu", "Bénéfice", "Clients", "Articles"), ...[...payload.sales].sort((a, b) => a.timestamp - b.timestamp).map((sale) => {
		const items = byId.get(sale.id) ?? [];
		return [
			{
				value: new Date(sale.timestamp),
				type: Date,
				format: "dd/mm/yyyy"
			},
			{
				value: formatTime(sale.timestamp),
				type: String
			},
			money(sale.total),
			money(sale.cash_given),
			money(sale.change_due),
			money(items.reduce((sum, i) => sum + lineProfit(i), 0)),
			{
				value: sale.customers_count ?? 1,
				type: Number
			},
			{
				value: items.map((i) => `${i.quantity}x ${i.name}`).join(" | "),
				type: String
			}
		];
	})];
	const depenses = [header("Date", "Catégorie", "Libellé", "Montant"), ...[...payload.expenses].sort((a, b) => a.timestamp - b.timestamp).map((e) => [
		{
			value: new Date(e.timestamp),
			type: Date,
			format: "dd/mm/yyyy"
		},
		{
			value: e.category,
			type: String
		},
		{
			value: e.label,
			type: String
		},
		money(e.amount)
	])];
	const parJour = [header("Jour", "Revenus", "Bénéfice brut", "Dépenses", "Bénéfice net", "Ventes"), ...stats.days.map((d) => [
		{
			value: new Date(d.day),
			type: Date,
			format: "dd/mm/yyyy"
		},
		money(d.revenue),
		money(d.profit),
		money(d.expenses),
		money(d.netProfit),
		{
			value: d.salesCount,
			type: Number
		}
	])];
	const parCategorie = [header("Catégorie", "Revenus", "Bénéfices", "Part"), ...stats.byCategory.map((c) => [
		{
			value: c.category,
			type: String
		},
		money(c.revenue),
		money(c.profit),
		{
			value: stats.revenue > 0 ? c.revenue / stats.revenue : 0,
			type: Number,
			format: "0.0%"
		}
	])];
	return writeXlsxFile([
		{
			sheet: "Résumé",
			data: resume
		},
		{
			sheet: "Ventes",
			data: ventes
		},
		{
			sheet: "Dépenses",
			data: depenses
		},
		{
			sheet: "Par jour",
			data: parJour
		},
		{
			sheet: "Par catégorie",
			data: parCategorie
		}
	]).toBlob();
}
var xlsxFilename = (payload) => reportFilename(payload, "xlsx");
//#endregion
//#region src/routes/reports.tsx?tsr-split=component
var chartConfig = {
	revenue: {
		label: "Revenus",
		color: "var(--chart-1)"
	},
	profit: {
		label: "Bénéfices",
		color: "var(--chart-2)"
	},
	expenses: {
		label: "Dépenses",
		color: "var(--chart-5)"
	}
};
function ReportsPage() {
	const qc = useQueryClient();
	const { workspaceName } = usePreferences();
	const [preset, setPreset] = useState("today");
	const [range, setRange] = useState();
	const chartRef = useRef(null);
	const { from, to, label } = useMemo(() => {
		if (preset === "custom" && range?.from && range?.to) {
			const start = new Date(range.from);
			start.setHours(0, 0, 0, 0);
			const end = new Date(range.to);
			end.setHours(0, 0, 0, 0);
			return {
				from: start.getTime(),
				to: end.getTime() + 864e5,
				label: `${formatDayShort(start.getTime())} – ${formatDayShort(end.getTime())}`
			};
		}
		if (preset === "today") return {
			...lastDaysRange(1),
			label: "Aujourd'hui"
		};
		const days = preset === "30" ? 30 : 7;
		return {
			...lastDaysRange(days),
			label: `${days} derniers jours`
		};
	}, [preset, range]);
	const { data } = usePeriodData(from, to);
	const sales = useMemo(() => data?.sales ?? [], [data]);
	const items = useMemo(() => data?.items ?? [], [data]);
	const expenses = useMemo(() => data?.expenses ?? [], [data]);
	const stats = useMemo(() => computePeriodStats(sales, items, from, to, expenses), [
		sales,
		items,
		from,
		to,
		expenses
	]);
	const payload = {
		label,
		from,
		to,
		stats,
		sales,
		items,
		expenses,
		workspaceName
	};
	const chartData = stats.days.map((d) => ({
		day: formatDayShort(d.day),
		revenue: d.revenue,
		profit: d.profit,
		expenses: d.expenses
	}));
	const closeMut = useMutation({
		mutationFn: closeDay,
		onSuccess: (n) => {
			qc.invalidateQueries({ queryKey: ["sales"] });
			toast.success(`${n} vente(s) clôturée(s)`);
		}
	});
	const salesToday = sales.filter((s) => s.timestamp >= startOfToday() && s.timestamp < startOfToday() + 864e5).length;
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-5xl px-4 py-6 space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
				className: "text-2xl font-bold flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(BarChart3, { className: "h-6 w-6" }), " Rapports & clôture"]
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground",
				children: "Analyse des ventes sur la période choisie."
			})] }),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ jsx(Tabs, {
						value: preset,
						onValueChange: (v) => setPreset(v),
						children: /* @__PURE__ */ jsxs(TabsList, { children: [
							/* @__PURE__ */ jsx(TabsTrigger, {
								value: "today",
								children: "Aujourd'hui"
							}),
							/* @__PURE__ */ jsx(TabsTrigger, {
								value: "7",
								children: "7 jours"
							}),
							/* @__PURE__ */ jsx(TabsTrigger, {
								value: "30",
								children: "30 jours"
							}),
							/* @__PURE__ */ jsx(TabsTrigger, {
								value: "custom",
								children: "Personnalisé"
							})
						] })
					}),
					preset === "custom" && /* @__PURE__ */ jsxs(Popover, { children: [/* @__PURE__ */ jsx(PopoverTrigger, {
						asChild: true,
						children: /* @__PURE__ */ jsxs(Button, {
							variant: "outline",
							children: [/* @__PURE__ */ jsx(CalendarDays, { className: "h-4 w-4 mr-2" }), range?.from && range?.to ? label : "Choisir les dates"]
						})
					}), /* @__PURE__ */ jsx(PopoverContent, {
						className: "w-auto p-0",
						align: "start",
						children: /* @__PURE__ */ jsx(Calendar, {
							mode: "range",
							selected: range,
							onSelect: setRange,
							numberOfMonths: 1
						})
					})] }),
					/* @__PURE__ */ jsx("span", {
						className: "text-sm text-muted-foreground",
						children: label
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Revenus",
						value: formatFCFA(stats.revenue),
						highlight: true
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Bénéfices",
						value: formatFCFA(stats.netProfit),
						hint: "net, dépenses déduites",
						highlight: true
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Dépenses",
						value: formatFCFA(stats.expenses)
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Ventes",
						value: String(stats.salesCount)
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Clients",
						value: String(stats.customersCount)
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Marge",
						value: formatPercent(stats.netMarginRate),
						hint: "bénéfice net ÷ revenus"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Panier moyen",
						value: formatFCFA(stats.averageBasket)
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Articles vendus",
						value: String(stats.itemsCount)
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Croissance",
						value: formatPercent(stats.growthRate, true),
						hint: "2ᵉ moitié vs 1re moitié"
					})
				]
			}),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, {
				className: "pb-2",
				children: /* @__PURE__ */ jsx(CardTitle, {
					className: "text-base",
					children: "Revenus et bénéfices par jour"
				})
			}), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", {
				ref: chartRef,
				children: /* @__PURE__ */ jsx(ChartContainer, {
					config: chartConfig,
					className: "aspect-[2/1] w-full",
					children: /* @__PURE__ */ jsxs(LineChart, {
						data: chartData,
						margin: {
							left: 4,
							right: 8,
							top: 8
						},
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, { vertical: false }),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "day",
								tickLine: false,
								axisLine: false,
								tickMargin: 8
							}),
							/* @__PURE__ */ jsx(YAxis, {
								width: 56,
								tickLine: false,
								axisLine: false
							}),
							/* @__PURE__ */ jsx(ChartTooltip, { content: /* @__PURE__ */ jsx(ChartTooltipContent, { formatter: (v) => formatFCFA(Number(v)) }) }),
							/* @__PURE__ */ jsx(Legend, {}),
							/* @__PURE__ */ jsx(Line, {
								dataKey: "revenue",
								name: "Revenus",
								type: "monotone",
								stroke: "var(--color-revenue)",
								strokeWidth: 2,
								dot: false
							}),
							/* @__PURE__ */ jsx(Line, {
								dataKey: "profit",
								name: "Bénéfices",
								type: "monotone",
								stroke: "var(--color-profit)",
								strokeWidth: 2,
								dot: false
							}),
							/* @__PURE__ */ jsx(Line, {
								dataKey: "expenses",
								name: "Dépenses",
								type: "monotone",
								stroke: "var(--color-expenses)",
								strokeWidth: 2,
								strokeDasharray: "4 4",
								dot: false
							})
						]
					})
				})
			}) })] }),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, {
					className: "pb-2",
					children: /* @__PURE__ */ jsx(CardTitle, {
						className: "text-base",
						children: "Faits saillants"
					})
				}), /* @__PURE__ */ jsxs(CardContent, {
					className: "space-y-2 text-sm",
					children: [
						/* @__PURE__ */ jsx(Highlight, {
							label: "Meilleur jour de vente",
							value: stats.bestDay ? `${formatDay(stats.bestDay.day)} — ${formatFCFA(stats.bestDay.revenue)}` : "aucune vente sur la période"
						}),
						/* @__PURE__ */ jsx(Highlight, {
							label: "Jour le moins rentable",
							value: stats.worstDay ? `${formatDay(stats.worstDay.day)} — ${formatFCFA(stats.worstDay.netProfit)} net` : "aucune activité sur la période"
						}),
						/* @__PURE__ */ jsx(Highlight, {
							label: "Marge brute moyenne",
							value: formatPercent(stats.marginRate)
						}),
						/* @__PURE__ */ jsx(Highlight, {
							label: "Marge nette moyenne",
							value: formatPercent(stats.netMarginRate)
						}),
						/* @__PURE__ */ jsx(Highlight, {
							label: "Taux de croissance",
							value: formatPercent(stats.growthRate, true)
						}),
						/* @__PURE__ */ jsx(Highlight, {
							label: "Bénéfice brut",
							value: formatFCFA(stats.profit)
						}),
						/* @__PURE__ */ jsx(Highlight, {
							label: "Dépenses",
							value: formatFCFA(stats.expenses)
						})
					]
				})] }), /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, {
					className: "pb-2",
					children: /* @__PURE__ */ jsx(CardTitle, {
						className: "text-base",
						children: "Revenus par catégorie"
					})
				}), /* @__PURE__ */ jsx(CardContent, { children: stats.byCategory.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted-foreground",
					children: "Aucune vente sur la période."
				}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(ChartContainer, {
					config: { revenue: {
						label: "Revenus",
						color: "var(--chart-1)"
					} },
					className: "aspect-[2/1] w-full",
					children: /* @__PURE__ */ jsxs(BarChart, {
						data: stats.byCategory,
						layout: "vertical",
						margin: { left: 8 },
						children: [
							/* @__PURE__ */ jsx(XAxis, {
								type: "number",
								hide: true
							}),
							/* @__PURE__ */ jsx(YAxis, {
								type: "category",
								dataKey: "category",
								width: 80,
								tickLine: false,
								axisLine: false
							}),
							/* @__PURE__ */ jsx(ChartTooltip, { content: /* @__PURE__ */ jsx(ChartTooltipContent, { formatter: (v) => formatFCFA(Number(v)) }) }),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "revenue",
								fill: "var(--color-revenue)",
								radius: 4
							})
						]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "mt-3 space-y-1 text-sm",
					children: stats.byCategory.map((c) => /* @__PURE__ */ jsxs("div", {
						className: "flex justify-between gap-2",
						children: [/* @__PURE__ */ jsx("span", { children: c.category }), /* @__PURE__ */ jsxs("span", {
							className: "text-muted-foreground",
							children: [
								formatFCFA(c.revenue),
								" ·",
								" ",
								formatPercent(stats.revenue > 0 ? c.revenue / stats.revenue : 0)
							]
						})]
					}, c.category))
				})] }) })] })]
			}),
			/* @__PURE__ */ jsx(ExportCard, {
				payload,
				chartRef
			}),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, {
				className: "text-base",
				children: "Clôture"
			}) }), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsxs(Button, {
				variant: "destructive",
				onClick: () => {
					if (confirm("Clôturer la journée ? Les ventes ne pourront plus être annulées sans PIN.")) closeMut.mutate();
				},
				disabled: salesToday === 0,
				children: [/* @__PURE__ */ jsx(Lock, { className: "h-4 w-4 mr-2" }), " Clôturer la journée"]
			}), /* @__PURE__ */ jsxs("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: [salesToday, " vente(s) aujourd'hui."]
			})] })] })
		]
	});
}
function Highlight({ label, value }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex justify-between gap-3",
		children: [/* @__PURE__ */ jsx("span", {
			className: "text-muted-foreground",
			children: label
		}), /* @__PURE__ */ jsx("span", {
			className: "font-medium text-right",
			children: value
		})]
	});
}
function ExportCard({ payload, chartRef }) {
	const [busy, setBusy] = useState(null);
	const { data: directory } = useQuery({
		queryKey: ["settings", "documents_dir"],
		queryFn: getDocumentsDirectoryName
	});
	async function run(kind, make) {
		setBusy(kind);
		try {
			const { blob, filename } = await make();
			const result = await saveDocument(blob, filename);
			toast.success(describeSaveResult(result, filename));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Export impossible");
		} finally {
			setBusy(null);
		}
	}
	const empty = payload.stats.salesCount === 0;
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, {
		className: "text-base",
		children: "Exports"
	}) }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-3",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap gap-2",
			children: [
				/* @__PURE__ */ jsxs(Button, {
					variant: "outline",
					disabled: empty || busy !== null,
					onClick: () => run("csv", async () => ({
						blob: buildCsvBlob(payload),
						filename: reportFilename(payload, "csv")
					})),
					children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4 mr-2" }), " CSV"]
				}),
				/* @__PURE__ */ jsxs(Button, {
					variant: "outline",
					disabled: empty || busy !== null,
					onClick: () => run("xlsx", async () => ({
						blob: await buildXlsxBlob(payload),
						filename: xlsxFilename(payload)
					})),
					children: [/* @__PURE__ */ jsx(FileSpreadsheet, { className: "h-4 w-4 mr-2" }), " Excel"]
				}),
				/* @__PURE__ */ jsxs(Button, {
					variant: "outline",
					disabled: empty || busy !== null,
					onClick: () => run("pdf", async () => ({
						blob: buildPdfBlob(payload, await captureChartPng(chartRef.current)),
						filename: pdfFilename(payload)
					})),
					children: [/* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 mr-2" }), " PDF"]
				})
			]
		}), /* @__PURE__ */ jsxs("p", {
			className: "text-xs text-muted-foreground",
			children: [
				directory ? /* @__PURE__ */ jsxs(Fragment, { children: [
					"Destination : « ",
					directory,
					" ». "
				] }) : /* @__PURE__ */ jsx(Fragment, { children: "Sans dossier choisi, les fichiers vont dans Téléchargements. " }),
				"Le dossier et la sauvegarde complète de la base sont dans",
				" ",
				/* @__PURE__ */ jsx(Link, {
					to: "/settings",
					className: "text-primary underline",
					children: "Paramètres"
				}),
				"."
			]
		})]
	})] });
}
//#endregion
export { ReportsPage as component };
