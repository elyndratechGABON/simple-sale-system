import { C as cn, b as updateProduct, h as listProducts, i as addProduct, l as deleteProduct, t as CATEGORIES, x as Button } from "./db-WliOSm7d.js";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-DTAGyVAm.js";
import { n as Input, t as Label } from "./label-DXgWLoGQ.js";
import { r as formatFCFA } from "./format-BOufqdbG.js";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-ChhSX-dj.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BTWjohVb.js";
import { t as Badge } from "./badge-CXw852iV.js";
import * as React from "react";
import { useMemo, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
//#region src/components/ui/checkbox.tsx
var Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(CheckboxPrimitive.Root, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ jsx(CheckboxPrimitive.Indicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
//#endregion
//#region src/routes/stocks.tsx?tsr-split=component
function StocksPage() {
	const qc = useQueryClient();
	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: listProducts
	});
	const [editing, setEditing] = useState(null);
	const [open, setOpen] = useState(false);
	const removeMut = useMutation({
		mutationFn: deleteProduct,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["products"] });
			toast.success("Produit supprimé");
		}
	});
	const grouped = useMemo(() => {
		const map = {};
		for (const p of products) (map[p.category] ??= []).push(p);
		return map;
	}, [products]);
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-5xl px-4 py-6 space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
				className: "text-2xl font-bold flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(Package, { className: "h-6 w-6" }), " Stocks & Produits"]
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground",
				children: "Créez et mettez à jour vos articles avant de vendre."
			})] }), /* @__PURE__ */ jsxs(Dialog, {
				open,
				onOpenChange: (v) => {
					setOpen(v);
					if (!v) setEditing(null);
				},
				children: [/* @__PURE__ */ jsx(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsxs(Button, {
						size: "lg",
						onClick: () => setEditing(null),
						children: [/* @__PURE__ */ jsx(Plus, { className: "h-5 w-5 mr-1" }), " Nouveau produit"]
					})
				}), /* @__PURE__ */ jsx(ProductForm, {
					editing,
					onClose: () => {
						setOpen(false);
						setEditing(null);
					}
				})]
			})]
		}), products.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
			className: "p-10 text-center text-muted-foreground",
			children: "Aucun produit. Cliquez sur « Nouveau produit » pour commencer."
		}) }) : Object.entries(grouped).map(([cat, items]) => /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, {
			className: "pb-3",
			children: /* @__PURE__ */ jsxs(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [cat, /* @__PURE__ */ jsx(Badge, {
					variant: "secondary",
					children: items.length
				})]
			})
		}), /* @__PURE__ */ jsx(CardContent, {
			className: "divide-y",
			children: items.map((p) => /* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between py-3 gap-3",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ jsx("div", {
						className: "font-medium truncate",
						children: p.name
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-sm text-muted-foreground",
						children: [
							p.cost > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
								"Achat ",
								formatFCFA(p.cost),
								" · "
							] }),
							"Vente ",
							formatFCFA(p.price),
							p.cost > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [" · Marge ", formatFCFA(p.price - p.cost)] }),
							" · Stock\xA0:",
							" ",
							/* @__PURE__ */ jsx("span", {
								className: Number.isFinite(p.stock) && p.stock <= 5 ? "text-destructive font-semibold" : "",
								children: Number.isFinite(p.stock) ? p.stock : "∞"
							})
						]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(Button, {
						size: "icon",
						variant: "ghost",
						onClick: () => {
							setEditing(p);
							setOpen(true);
						},
						children: /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4" })
					}), /* @__PURE__ */ jsx(Button, {
						size: "icon",
						variant: "ghost",
						onClick: () => {
							if (confirm(`Supprimer "${p.name}" ?`)) removeMut.mutate(p.id);
						},
						children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4 text-destructive" })
					})]
				})]
			}, p.id))
		})] }, cat))]
	});
}
function ProductForm({ editing, onClose }) {
	const qc = useQueryClient();
	const [name, setName] = useState(editing?.name ?? "");
	const [cost, setCost] = useState(editing?.cost ? String(editing.cost) : "");
	const [price, setPrice] = useState(editing ? String(editing.price) : "");
	const [unlimited, setUnlimited] = useState(editing ? !Number.isFinite(editing.stock) : false);
	const [stock, setStock] = useState(editing && Number.isFinite(editing.stock) ? String(editing.stock) : "");
	const [category, setCategory] = useState(editing?.category ?? "Boisson");
	const saveMut = useMutation({
		mutationFn: async () => {
			const p = {
				name: name.trim(),
				cost: Number(cost) || 0,
				price: Number(price) || 0,
				stock: unlimited ? Number.POSITIVE_INFINITY : Number(stock) || 0,
				category
			};
			if (!p.name) throw new Error("Nom requis");
			if (p.price <= 0) throw new Error("Prix invalide");
			if (editing) await updateProduct({
				...editing,
				...p
			});
			else await addProduct(p);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["products"] });
			toast.success(editing ? "Produit mis à jour" : "Produit ajouté");
			onClose();
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ jsxs(DialogContent, { children: [
		/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Modifier le produit" : "Nouveau produit" }) }),
		/* @__PURE__ */ jsxs("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
					htmlFor: "name",
					children: "Nom"
				}), /* @__PURE__ */ jsx(Input, {
					id: "name",
					value: name,
					onChange: (e) => setName(e.target.value),
					placeholder: "Ex : Regab"
				})] }),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-3 gap-3",
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "cost",
							children: "Prix d'achat"
						}), /* @__PURE__ */ jsx(Input, {
							id: "cost",
							inputMode: "numeric",
							value: cost,
							onChange: (e) => setCost(e.target.value.replace(/\D/g, "")),
							placeholder: "200"
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "price",
							children: "Prix de vente"
						}), /* @__PURE__ */ jsx(Input, {
							id: "price",
							inputMode: "numeric",
							value: price,
							onChange: (e) => setPrice(e.target.value.replace(/\D/g, "")),
							placeholder: "300"
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "stock",
							children: "Stock"
						}), /* @__PURE__ */ jsx(Input, {
							id: "stock",
							inputMode: "numeric",
							value: stock,
							onChange: (e) => setStock(e.target.value.replace(/\D/g, "")),
							placeholder: "50",
							disabled: unlimited
						})] })
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(Checkbox, {
						id: "unlimited",
						checked: unlimited,
						onCheckedChange: (v) => setUnlimited(Boolean(v))
					}), /* @__PURE__ */ jsx(Label, {
						htmlFor: "unlimited",
						className: "cursor-pointer",
						children: "Stock illimité (service)"
					})]
				}),
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Catégorie" }), /* @__PURE__ */ jsxs(Select, {
					value: category,
					onValueChange: (v) => setCategory(v),
					children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: CATEGORIES.map((c) => /* @__PURE__ */ jsx(SelectItem, {
						value: c,
						children: c
					}, c)) })]
				})] })
			]
		}),
		/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onClose,
			children: "Annuler"
		}), /* @__PURE__ */ jsx(Button, {
			onClick: () => saveMut.mutate(),
			disabled: saveMut.isPending,
			children: "Enregistrer"
		})] })
	] });
}
//#endregion
export { StocksPage as component };
