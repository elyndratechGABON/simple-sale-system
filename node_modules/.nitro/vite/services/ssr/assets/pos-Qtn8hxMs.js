import { C as cn, h as listProducts, s as createSale, t as CATEGORIES, x as Button } from "./db-WliOSm7d.js";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-DTAGyVAm.js";
import { n as Input, t as Label } from "./label-DXgWLoGQ.js";
import { r as formatFCFA } from "./format-BOufqdbG.js";
import { n as CardContent, t as Card } from "./card-ChhSX-dj.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BTWjohVb.js";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/pos.tsx?tsr-split=component
var QUICK_AMOUNTS = [
	500,
	1e3,
	2e3,
	5e3,
	1e4
];
function PosPage() {
	const qc = useQueryClient();
	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: listProducts
	});
	const [active, setActive] = useState(false);
	const [cart, setCart] = useState({});
	const [freeLines, setFreeLines] = useState([]);
	const [freeOpen, setFreeOpen] = useState(false);
	const [cashGiven, setCashGiven] = useState("");
	const [filter, setFilter] = useState("Tous");
	const [customers, setCustomers] = useState(1);
	const categories = useMemo(() => {
		const s = /* @__PURE__ */ new Set();
		products.forEach((p) => s.add(p.category));
		return Array.from(s);
	}, [products]);
	const lines = useMemo(() => {
		return [...Object.entries(cart).map(([id, qty]) => {
			const p = products.find((x) => x.id === id);
			if (!p || qty <= 0) return null;
			return {
				key: p.id,
				product_id: p.id,
				name: p.name,
				price: p.price,
				cost: p.cost,
				category: p.category,
				quantity: qty
			};
		}).filter((x) => Boolean(x)), ...freeLines];
	}, [
		cart,
		products,
		freeLines
	]);
	const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
	const cash = Number(cashGiven) || 0;
	const change = cash - total;
	const insufficient = cash > 0 && change < 0;
	const canValidate = lines.length > 0 && cash >= total && total > 0;
	const filtered = filter === "Tous" ? products : products.filter((p) => p.category === filter);
	const saleMut = useMutation({
		mutationFn: () => createSale({
			lines: lines.map(({ key: _key, ...line }) => line),
			cash_given: cash,
			customers_count: customers
		}),
		onSuccess: (sale) => {
			qc.invalidateQueries({ queryKey: ["products"] });
			qc.invalidateQueries({ queryKey: ["sales"] });
			toast.success("Vente enregistrée", { description: `Total ${formatFCFA(sale.total)} · Rendu ${formatFCFA(sale.change_due)}` });
			resetSale();
		},
		onError: (e) => toast.error(e.message)
	});
	function resetSale() {
		setCart({});
		setFreeLines([]);
		setCashGiven("");
		setCustomers(1);
		setActive(false);
	}
	function addOne(p) {
		setCart((c) => {
			const next = (c[p.id] ?? 0) + 1;
			if (Number.isFinite(p.stock) && next > p.stock) {
				toast.warning(`Stock insuffisant pour ${p.name}`);
				return c;
			}
			return {
				...c,
				[p.id]: next
			};
		});
	}
	function addOneByKey(line) {
		if (line.product_id) {
			const p = products.find((x) => x.id === line.product_id);
			if (p) addOne(p);
			return;
		}
		setFreeLines((f) => f.map((l) => l.key === line.key ? {
			...l,
			quantity: l.quantity + 1
		} : l));
	}
	function removeOne(line) {
		if (line.product_id) {
			const id = line.product_id;
			setCart((c) => {
				const next = (c[id] ?? 0) - 1;
				const copy = { ...c };
				if (next <= 0) delete copy[id];
				else copy[id] = next;
				return copy;
			});
			return;
		}
		setFreeLines((f) => f.map((l) => l.key === line.key ? {
			...l,
			quantity: l.quantity - 1
		} : l).filter((l) => l.quantity > 0));
	}
	function removeLine(line) {
		if (line.product_id) {
			const id = line.product_id;
			setCart((c) => {
				const copy = { ...c };
				delete copy[id];
				return copy;
			});
			return;
		}
		setFreeLines((f) => f.filter((l) => l.key !== line.key));
	}
	if (!active) return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-3xl px-4 py-16 flex flex-col items-center gap-8",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "text-center space-y-2",
				children: [/* @__PURE__ */ jsx("h1", {
					className: "text-3xl font-bold",
					children: "Caisse"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-muted-foreground",
					children: "Démarrez une commande pour encaisser un client."
				})]
			}),
			/* @__PURE__ */ jsxs(Button, {
				size: "lg",
				className: "h-24 w-full max-w-md text-2xl gap-3 shadow-lg",
				onClick: () => setActive(true),
				children: [/* @__PURE__ */ jsx(Plus, { className: "h-8 w-8" }), "Nouvelle commande"]
			}),
			products.length === 0 && /* @__PURE__ */ jsxs("div", {
				className: "text-center text-sm text-muted-foreground",
				children: [
					"Aucun produit enregistré — vous pouvez quand même encaisser en saisissant les articles à la main.",
					" ",
					/* @__PURE__ */ jsx(Link, {
						to: "/stocks",
						className: "text-primary underline",
						children: "Ajouter des produits"
					})
				]
			})
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-7xl px-4 py-4 grid gap-4 lg:grid-cols-[1fr_400px]",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-2 flex-wrap",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-xl font-bold",
							children: "Articles"
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex gap-1 flex-wrap",
							children: [/* @__PURE__ */ jsx(FilterChip, {
								active: filter === "Tous",
								onClick: () => setFilter("Tous"),
								children: "Tous"
							}), categories.map((c) => /* @__PURE__ */ jsx(FilterChip, {
								active: filter === c,
								onClick: () => setFilter(c),
								children: c
							}, c))]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-2 sm:grid-cols-3 gap-3",
						children: filtered.map((p) => {
							const inCart = cart[p.id] ?? 0;
							const out = Number.isFinite(p.stock) && p.stock - inCart <= 0;
							return /* @__PURE__ */ jsxs("button", {
								onClick: () => addOne(p),
								disabled: out,
								className: cn("relative rounded-xl border bg-card p-4 text-left min-h-[100px] transition-all", "hover:border-primary hover:shadow-md active:scale-[0.98]", out && "opacity-50 cursor-not-allowed"),
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "font-semibold leading-tight",
										children: p.name
									}),
									/* @__PURE__ */ jsx("div", {
										className: "mt-1 text-lg font-bold text-primary",
										children: formatFCFA(p.price)
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "mt-1 text-xs text-muted-foreground",
										children: ["Stock : ", Number.isFinite(p.stock) ? p.stock - inCart : "∞"]
									}),
									inCart > 0 && /* @__PURE__ */ jsx("span", {
										className: "absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow",
										children: inCart
									})
								]
							}, p.id);
						})
					}),
					products.length === 0 && /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground",
						children: "Aucun produit au catalogue. Utilisez « Article manuel » dans le panier pour saisir la vente à la main."
					})
				]
			}),
			/* @__PURE__ */ jsx(Card, {
				className: "lg:sticky lg:top-20 h-fit",
				children: /* @__PURE__ */ jsxs(CardContent, {
					className: "p-4 space-y-4",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ jsxs("h2", {
								className: "text-lg font-bold flex items-center gap-2",
								children: [/* @__PURE__ */ jsx(ShoppingCart, { className: "h-5 w-5" }), " Panier"]
							}), /* @__PURE__ */ jsxs(Button, {
								size: "sm",
								variant: "ghost",
								onClick: resetSale,
								children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4 mr-1" }), " Annuler"]
							})]
						}),
						/* @__PURE__ */ jsxs(Button, {
							variant: "outline",
							size: "sm",
							className: "w-full",
							onClick: () => setFreeOpen(true),
							children: [/* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-1" }), " Article manuel"]
						}),
						lines.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground py-6 text-center",
							children: "Ajoutez des articles depuis la grille ou saisissez-les à la main."
						}) : /* @__PURE__ */ jsx("div", {
							className: "space-y-2 max-h-64 overflow-auto",
							children: /* @__PURE__ */ jsx(AnimatePresence, {
								initial: false,
								mode: "popLayout",
								children: lines.map((l) => /* @__PURE__ */ jsxs(motion.div, {
									layout: true,
									initial: {
										opacity: 0,
										x: -12
									},
									animate: {
										opacity: 1,
										x: 0
									},
									exit: {
										opacity: 0,
										x: 12
									},
									transition: {
										duration: .15,
										ease: "easeOut"
									},
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ jsx("div", {
												className: "font-medium truncate",
												children: l.name
											}), /* @__PURE__ */ jsxs("div", {
												className: "text-xs text-muted-foreground",
												children: [
													formatFCFA(l.price),
													" × ",
													l.quantity
												]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-1",
											children: [
												/* @__PURE__ */ jsx(Button, {
													size: "icon",
													variant: "outline",
													className: "h-8 w-8",
													onClick: () => removeOne(l),
													children: /* @__PURE__ */ jsx(Minus, { className: "h-3 w-3" })
												}),
												/* @__PURE__ */ jsx("span", {
													className: "w-6 text-center font-semibold",
													children: l.quantity
												}),
												/* @__PURE__ */ jsx(Button, {
													size: "icon",
													variant: "outline",
													className: "h-8 w-8",
													onClick: () => addOneByKey(l),
													children: /* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" })
												}),
												/* @__PURE__ */ jsx(Button, {
													size: "icon",
													variant: "ghost",
													className: "h-8 w-8",
													onClick: () => removeLine(l),
													children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3 text-destructive" })
												})
											]
										}),
										/* @__PURE__ */ jsx("div", {
											className: "w-20 text-right font-semibold",
											children: formatFCFA(l.price * l.quantity)
										})
									]
								}, l.key))
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "border-t pt-3 flex items-center justify-between",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-lg font-semibold",
								children: "Total"
							}), /* @__PURE__ */ jsx("span", {
								className: "text-3xl font-bold text-primary",
								children: formatFCFA(total)
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between gap-2 text-sm",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground",
								children: "Clients servis"
							}), /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-1",
								children: [
									/* @__PURE__ */ jsx(Button, {
										size: "icon",
										variant: "outline",
										className: "h-8 w-8",
										"aria-label": "Un client de moins",
										disabled: customers <= 1,
										onClick: () => setCustomers((c) => Math.max(1, c - 1)),
										children: /* @__PURE__ */ jsx(Minus, { className: "h-3 w-3" })
									}),
									/* @__PURE__ */ jsx("span", {
										className: "w-6 text-center font-semibold",
										children: customers
									}),
									/* @__PURE__ */ jsx(Button, {
										size: "icon",
										variant: "outline",
										className: "h-8 w-8",
										"aria-label": "Un client de plus",
										onClick: () => setCustomers((c) => c + 1),
										children: /* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" })
									})
								]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-2",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "text-sm font-medium",
									children: "Argent donné"
								}),
								/* @__PURE__ */ jsx(Input, {
									inputMode: "numeric",
									value: cashGiven,
									onChange: (e) => setCashGiven(e.target.value.replace(/\D/g, "")),
									placeholder: "0",
									className: "h-14 text-2xl text-right font-bold"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap gap-1",
									children: [QUICK_AMOUNTS.map((amt) => /* @__PURE__ */ jsxs(Button, {
										variant: "secondary",
										size: "sm",
										onClick: () => setCashGiven(String((Number(cashGiven) || 0) + amt)),
										children: ["+", formatFCFA(amt)]
									}, amt)), /* @__PURE__ */ jsx(Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => setCashGiven(""),
										children: "Vider"
									})]
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: cn("rounded-lg p-4 flex items-center justify-between", insufficient ? "bg-destructive/10" : "bg-accent"),
							children: [/* @__PURE__ */ jsx("span", {
								className: "font-semibold",
								children: insufficient ? "Manque" : "Monnaie à rendre"
							}), /* @__PURE__ */ jsx("span", {
								className: cn("text-3xl font-bold", insufficient ? "text-destructive" : "text-primary"),
								children: formatFCFA(Math.abs(change))
							})]
						}),
						insufficient && /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-destructive",
							children: [
								"Montant insuffisant. Demander au moins ",
								formatFCFA(total),
								"."
							]
						}),
						/* @__PURE__ */ jsxs(Button, {
							size: "lg",
							className: "w-full h-16 text-lg gap-2",
							disabled: !canValidate || saleMut.isPending,
							onClick: () => saleMut.mutate(),
							children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "h-5 w-5" }), "Valider la vente"]
						})
					]
				})
			}),
			/* @__PURE__ */ jsx(FreeLineDialog, {
				open: freeOpen,
				onOpenChange: setFreeOpen,
				onAdd: (l) => setFreeLines((f) => [...f, l])
			})
		]
	});
}
function FreeLineDialog({ open, onOpenChange, onAdd }) {
	const [name, setName] = useState("");
	const [cost, setCost] = useState("");
	const [price, setPrice] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [category, setCategory] = useState("Boisson");
	function reset() {
		setName("");
		setCost("");
		setPrice("");
		setQuantity("1");
		setCategory("Boisson");
	}
	function submit() {
		const label = name.trim();
		if (!label) {
			toast.error("Libellé requis");
			return;
		}
		if ((Number(price) || 0) <= 0) {
			toast.error("Prix de vente invalide");
			return;
		}
		onAdd({
			key: `libre_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			name: label,
			cost: Number(cost) || 0,
			price: Number(price),
			category,
			quantity: Math.max(1, Number(quantity) || 1)
		});
		reset();
		onOpenChange(false);
	}
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange: (v) => {
			if (!v) reset();
			onOpenChange(v);
		},
		children: /* @__PURE__ */ jsxs(DialogContent, { children: [
			/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Article manuel" }) }),
			/* @__PURE__ */ jsxs("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
						htmlFor: "free-name",
						children: "Libellé"
					}), /* @__PURE__ */ jsx(Input, {
						id: "free-name",
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: "Ex : Regab",
						autoFocus: true
					})] }),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-3 gap-3",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "free-cost",
								children: "Prix d'achat"
							}), /* @__PURE__ */ jsx(Input, {
								id: "free-cost",
								inputMode: "numeric",
								value: cost,
								onChange: (e) => setCost(e.target.value.replace(/\D/g, "")),
								placeholder: "200"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "free-price",
								children: "Prix de vente"
							}), /* @__PURE__ */ jsx(Input, {
								id: "free-price",
								inputMode: "numeric",
								value: price,
								onChange: (e) => setPrice(e.target.value.replace(/\D/g, "")),
								placeholder: "300"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "free-qty",
								children: "Quantité"
							}), /* @__PURE__ */ jsx(Input, {
								id: "free-qty",
								inputMode: "numeric",
								value: quantity,
								onChange: (e) => setQuantity(e.target.value.replace(/\D/g, "")),
								placeholder: "1"
							})] })
						]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Catégorie" }), /* @__PURE__ */ jsxs(Select, {
						value: category,
						onValueChange: (v) => setCategory(v),
						children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: CATEGORIES.map((c) => /* @__PURE__ */ jsx(SelectItem, {
							value: c,
							children: c
						}, c)) })]
					})] }),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted-foreground",
						children: "Sans prix d'achat, cette vente comptera entièrement comme bénéfice dans les rapports."
					})
				]
			}),
			/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
				variant: "ghost",
				onClick: () => onOpenChange(false),
				children: "Annuler"
			}), /* @__PURE__ */ jsx(Button, {
				onClick: submit,
				children: "Ajouter au panier"
			})] })
		] })
	});
}
function FilterChip({ active, onClick, children }) {
	return /* @__PURE__ */ jsx("button", {
		onClick,
		className: cn("px-3 py-1 rounded-full text-sm border transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"),
		children
	});
}
//#endregion
export { PosPage as component };
