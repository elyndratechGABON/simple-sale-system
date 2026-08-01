import { a as __toESM } from "../_runtime.mjs";
import { n as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { S as startOfToday, _ as listExpenses, d as deleteExpense, i as addExpense, r as EXPENSE_CATEGORIES, t as Button } from "./db-WliOSm7d.mjs";
import { a as Trash2, n as Wallet, u as Plus } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-DTAGyVAm.mjs";
import { n as Label, t as Input } from "./label-DXgWLoGQ.mjs";
import { r as formatFCFA, t as formatDay } from "./format-BOufqdbG.mjs";
import { n as CardContent, t as Card } from "./card-ChhSX-dj.mjs";
import { r as lastDaysRange, t as StatCard } from "./StatCard-CfCcfEaM.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BTWjohVb.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { o as objectType, r as enumType, s as stringType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/expenses-BkI00wC5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var expenseSchema = objectType({
	label: stringType().trim().min(1, "Libellé requis"),
	amount: stringType().min(1, "Montant requis").transform((v) => Number(v.replace(/\D/g, ""))).refine((n) => n > 0, "Montant invalide"),
	category: enumType([
		"Achat",
		"Transport",
		"Salaire",
		"Loyer",
		"Autre"
	]),
	date: stringType().min(1, "Date requise")
});
/** "AAAA-MM-JJ" → minuit LOCAL. `new Date("2026-08-01")` donnerait minuit UTC, ce qui
*  décale la dépense d'un jour dans les fuseaux à l'ouest de Greenwich. */
function dateToTimestamp(value) {
	const [y, m, d] = value.split("-").map(Number);
	return new Date(y, m - 1, d).getTime();
}
function todayInputValue() {
	const d = /* @__PURE__ */ new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function ExpensesPage() {
	const qc = useQueryClient();
	const [open, setOpen] = (0, import_react.useState)(false);
	const month = (0, import_react.useMemo)(() => lastDaysRange(30), []);
	const { data: expenses = [] } = useQuery({
		queryKey: [
			"sales",
			"expenses",
			month.from,
			month.to
		],
		queryFn: () => listExpenses(month.from, month.to)
	});
	const todayStart = startOfToday();
	const todayTotal = expenses.filter((e) => e.timestamp >= todayStart).reduce((s, e) => s + e.amount, 0);
	const monthTotal = expenses.reduce((s, e) => s + e.amount, 0);
	const deleteMut = useMutation({
		mutationFn: deleteExpense,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sales"] });
			toast.success("Dépense supprimée");
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-3xl px-4 py-6 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "h-6 w-6" }), " Dépenses"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Loyer, transport, salaires — tout ce qui n'est pas un achat de marchandise."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => setOpen(true),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " Nouvelle dépense"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Dépenses du jour",
					value: formatFCFA(todayTotal),
					highlight: true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Dépenses sur 30 jours",
					value: formatFCFA(monthTotal)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: expenses.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "p-8 text-center text-sm text-muted-foreground",
					children: "Aucune dépense sur les 30 derniers jours."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y",
					children: expenses.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3 px-4 py-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium truncate",
									children: e.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground",
									children: [
										e.category,
										" · ",
										formatDay(e.timestamp)
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold shrink-0",
								children: formatFCFA(e.amount)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								className: "h-8 w-8 shrink-0",
								"aria-label": `Supprimer ${e.label}`,
								onClick: () => deleteMut.mutate(e.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4 text-destructive" })
							})
						]
					}, e.id))
				})
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExpenseDialog, {
				open,
				onOpenChange: setOpen
			})
		]
	});
}
function ExpenseDialog({ open, onOpenChange }) {
	const qc = useQueryClient();
	const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
		resolver: u(expenseSchema),
		defaultValues: {
			label: "",
			amount: "",
			category: "Autre",
			date: todayInputValue()
		}
	});
	const category = watch("category");
	const addMut = useMutation({
		mutationFn: (values) => addExpense({
			label: values.label,
			amount: values.amount,
			category: values.category,
			timestamp: dateToTimestamp(values.date)
		}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sales"] });
			toast.success("Dépense enregistrée");
			reset({
				label: "",
				amount: "",
				category: "Autre",
				date: todayInputValue()
			});
			onOpenChange(false);
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Nouvelle dépense" }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				id: "expense-form",
				onSubmit: handleSubmit((values) => addMut.mutate(values)),
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "exp-label",
							children: "Libellé"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "exp-label",
							placeholder: "Ex : Loyer août",
							autoFocus: true,
							...register("label")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: errors.label?.message })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "exp-amount",
								children: "Montant (FCFA)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "exp-amount",
								inputMode: "numeric",
								placeholder: "50000",
								...register("amount")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: errors.amount?.message })
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "exp-date",
								children: "Date"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "exp-date",
								type: "date",
								...register("date")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: errors.date?.message })
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Catégorie" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: category,
						onValueChange: (v) => setValue("category", v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: EXPENSE_CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: c,
							children: c
						}, c)) })]
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: () => onOpenChange(false),
				children: "Annuler"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				form: "expense-form",
				disabled: isSubmitting || addMut.isPending,
				children: "Enregistrer"
			})] })
		] })
	});
}
function FieldError({ message }) {
	if (!message) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-1 text-xs text-destructive",
		children: message
	});
}
//#endregion
export { ExpensesPage as component };
