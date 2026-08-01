import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { m as getSaleItems, s as cancelSale, t as Button, y as listSales } from "./db-WliOSm7d.mjs";
import { C as ChevronUp, E as ChevronDown, _ as History, t as X } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-DTAGyVAm.mjs";
import { n as Label, t as Input } from "./label-DXgWLoGQ.mjs";
import { a as formatTime, r as formatFCFA, t as formatDay } from "./format-BOufqdbG.mjs";
import { n as CardContent, t as Card } from "./card-ChhSX-dj.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Badge } from "./badge-CXw852iV.mjs";
import { n as verifyPin } from "./pin-D6dTIodF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/history-BTZc0c0-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function HistoryPage() {
	const { data: sales = [] } = useQuery({
		queryKey: ["sales", "all"],
		queryFn: () => listSales()
	});
	const total = sales.reduce((s, x) => s + x.total, 0);
	const days = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const s of sales) {
			const key = new Date(s.timestamp).setHours(0, 0, 0, 0);
			const bucket = map.get(key);
			if (bucket) bucket.push(s);
			else map.set(key, [s]);
		}
		return Array.from(map.entries());
	}, [sales]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-4xl px-4 py-6 space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
			className: "text-2xl font-bold flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "h-6 w-6" }), " Historique des ventes"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm text-muted-foreground",
			children: [
				sales.length,
				" vente",
				sales.length > 1 ? "s" : "",
				" · Total encaissé",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-semibold text-foreground",
					children: formatFCFA(total)
				})
			]
		})] }), sales.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "p-10 text-center text-muted-foreground",
			children: "Aucune vente enregistrée."
		}) }) : days.map(([day, daySales]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-2 pt-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-semibold first-letter:uppercase",
					children: formatDay(day)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-sm text-muted-foreground",
					children: [
						daySales.length,
						" vente",
						daySales.length > 1 ? "s" : "",
						" ·",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold text-foreground",
							children: formatFCFA(daySales.reduce((s, x) => s + x.total, 0))
						})
					]
				})]
			}), daySales.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaleRow, { sale: s }, s.id))]
		}, day))]
	});
}
function SaleRow({ sale }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [pinOpen, setPinOpen] = (0, import_react.useState)(false);
	const [pin, setPin] = (0, import_react.useState)("");
	const qc = useQueryClient();
	const items = useQuery({
		queryKey: ["sale_items", sale.id],
		queryFn: () => getSaleItems(sale.id),
		enabled: open
	});
	const cancelMut = useMutation({
		mutationFn: () => cancelSale(sale.id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sales"] });
			qc.invalidateQueries({ queryKey: ["products"] });
			toast.success("Vente annulée, stock restauré");
			setPinOpen(false);
			setPin("");
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-semibold",
						children: formatTime(sale.timestamp)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-sm text-muted-foreground",
						children: [
							"Donné ",
							formatFCFA(sale.cash_given),
							" · Rendu ",
							formatFCFA(sale.change_due)
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xl font-bold text-primary",
					children: formatFCFA(sale.total)
				}),
				sale.day_closed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "secondary",
					children: "clôturée"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					onClick: () => setOpen((o) => !o),
					children: open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					onClick: () => setPinOpen(true),
					disabled: sale.day_closed,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4 text-destructive" })
				})
			]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 border-t pt-3 space-y-1 text-sm",
			children: items.data?.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					it.quantity,
					" × ",
					it.name
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: formatFCFA(it.price_at_sale * it.quantity)
				})]
			}, it.id))
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: pinOpen,
		onOpenChange: setPinOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Annuler cette vente ?" }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Entrez le code PIN pour confirmer l'annulation. Le stock sera restauré."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "pin",
					children: "Code PIN"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "pin",
					type: "password",
					inputMode: "numeric",
					value: pin,
					onChange: (e) => setPin(e.target.value),
					autoFocus: true
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: () => setPinOpen(false),
				children: "Annuler"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "destructive",
				onClick: () => {
					if (!verifyPin(pin)) {
						toast.error("Code PIN incorrect");
						return;
					}
					cancelMut.mutate();
				},
				children: "Confirmer l'annulation"
			})] })
		] })
	})] });
}
//#endregion
export { HistoryPage as component };
