import { c as deleteExpense, m as listExpenses, n as EXPENSE_CATEGORIES, r as addExpense, x as Button, y as startOfToday } from "./db-WliOSm7d.js";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-DTAGyVAm.js";
import { n as Input, t as Label } from "./label-DXgWLoGQ.js";
import { r as formatFCFA, t as formatDay } from "./format-BOufqdbG.js";
import { r as lastDaysRange, t as StatCard } from "./StatCard-CfCcfEaM.js";
import { n as CardContent, t as Card } from "./card-ChhSX-dj.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BTWjohVb.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
//#region src/routes/expenses.tsx?tsr-split=component
var expenseSchema = z.object({
	label: z.string().trim().min(1, "Libellé requis"),
	amount: z.string().min(1, "Montant requis").transform((v) => Number(v.replace(/\D/g, ""))).refine((n) => n > 0, "Montant invalide"),
	category: z.enum([
		"Achat",
		"Transport",
		"Salaire",
		"Loyer",
		"Autre"
	]),
	date: z.string().min(1, "Date requise")
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
	const [open, setOpen] = useState(false);
	const month = useMemo(() => lastDaysRange(30), []);
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
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-3xl px-4 py-6 space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
					className: "text-2xl font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(Wallet, { className: "h-6 w-6" }), " Dépenses"]
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted-foreground",
					children: "Loyer, transport, salaires — tout ce qui n'est pas un achat de marchandise."
				})] }), /* @__PURE__ */ jsxs(Button, {
					onClick: () => setOpen(true),
					children: [/* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-2" }), " Nouvelle dépense"]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ jsx(StatCard, {
					label: "Dépenses du jour",
					value: formatFCFA(todayTotal),
					highlight: true
				}), /* @__PURE__ */ jsx(StatCard, {
					label: "Dépenses sur 30 jours",
					value: formatFCFA(monthTotal)
				})]
			}),
			/* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
				className: "p-0",
				children: expenses.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "p-8 text-center text-sm text-muted-foreground",
					children: "Aucune dépense sur les 30 derniers jours."
				}) : /* @__PURE__ */ jsx("ul", {
					className: "divide-y",
					children: expenses.map((e) => /* @__PURE__ */ jsxs("li", {
						className: "flex items-center gap-3 px-4 py-3",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ jsx("div", {
									className: "font-medium truncate",
									children: e.label
								}), /* @__PURE__ */ jsxs("div", {
									className: "text-xs text-muted-foreground",
									children: [
										e.category,
										" · ",
										formatDay(e.timestamp)
									]
								})]
							}),
							/* @__PURE__ */ jsx("span", {
								className: "font-semibold shrink-0",
								children: formatFCFA(e.amount)
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								className: "h-8 w-8 shrink-0",
								"aria-label": `Supprimer ${e.label}`,
								onClick: () => deleteMut.mutate(e.id),
								children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4 text-destructive" })
							})
						]
					}, e.id))
				})
			}) }),
			/* @__PURE__ */ jsx(ExpenseDialog, {
				open,
				onOpenChange: setOpen
			})
		]
	});
}
function ExpenseDialog({ open, onOpenChange }) {
	const qc = useQueryClient();
	const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
		resolver: zodResolver(expenseSchema),
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
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(DialogContent, { children: [
			/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Nouvelle dépense" }) }),
			/* @__PURE__ */ jsxs("form", {
				id: "expense-form",
				onSubmit: handleSubmit((values) => addMut.mutate(values)),
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx(Label, {
							htmlFor: "exp-label",
							children: "Libellé"
						}),
						/* @__PURE__ */ jsx(Input, {
							id: "exp-label",
							placeholder: "Ex : Loyer août",
							autoFocus: true,
							...register("label")
						}),
						/* @__PURE__ */ jsx(FieldError, { message: errors.label?.message })
					] }),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx(Label, {
								htmlFor: "exp-amount",
								children: "Montant (FCFA)"
							}),
							/* @__PURE__ */ jsx(Input, {
								id: "exp-amount",
								inputMode: "numeric",
								placeholder: "50000",
								...register("amount")
							}),
							/* @__PURE__ */ jsx(FieldError, { message: errors.amount?.message })
						] }), /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx(Label, {
								htmlFor: "exp-date",
								children: "Date"
							}),
							/* @__PURE__ */ jsx(Input, {
								id: "exp-date",
								type: "date",
								...register("date")
							}),
							/* @__PURE__ */ jsx(FieldError, { message: errors.date?.message })
						] })]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Catégorie" }), /* @__PURE__ */ jsxs(Select, {
						value: category,
						onValueChange: (v) => setValue("category", v),
						children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: EXPENSE_CATEGORIES.map((c) => /* @__PURE__ */ jsx(SelectItem, {
							value: c,
							children: c
						}, c)) })]
					})] })
				]
			}),
			/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
				variant: "ghost",
				onClick: () => onOpenChange(false),
				children: "Annuler"
			}), /* @__PURE__ */ jsx(Button, {
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
	return /* @__PURE__ */ jsx("p", {
		className: "mt-1 text-xs text-destructive",
		children: message
	});
}
//#endregion
export { ExpensesPage as component };
