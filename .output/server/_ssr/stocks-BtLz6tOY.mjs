import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { C as updateProduct, a as addProduct, f as deleteProduct, l as cn, n as CATEGORIES, t as Button, v as listProducts } from "./db-WliOSm7d.mjs";
import { D as Check, a as Trash2, d as Pencil, p as Package, u as Plus } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-DTAGyVAm.mjs";
import { n as Label, t as Input } from "./label-DXgWLoGQ.mjs";
import { r as formatFCFA } from "./format-BOufqdbG.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-ChhSX-dj.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BTWjohVb.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Badge } from "./badge-CXw852iV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stocks-BtLz6tOY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxIndicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = Checkbox$1.displayName;
function StocksPage() {
	const qc = useQueryClient();
	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: listProducts
	});
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(false);
	const removeMut = useMutation({
		mutationFn: deleteProduct,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["products"] });
			toast.success("Produit supprimé");
		}
	});
	const grouped = (0, import_react.useMemo)(() => {
		const map = {};
		for (const p of products) (map[p.category] ??= []).push(p);
		return map;
	}, [products]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-5xl px-4 py-6 space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-6 w-6" }), " Stocks & Produits"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Créez et mettez à jour vos articles avant de vendre."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
				open,
				onOpenChange: (v) => {
					setOpen(v);
					if (!v) setEditing(null);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "lg",
						onClick: () => setEditing(null),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-5 w-5 mr-1" }), " Nouveau produit"]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductForm, {
					editing,
					onClose: () => {
						setOpen(false);
						setEditing(null);
					}
				})]
			})]
		}), products.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "p-10 text-center text-muted-foreground",
			children: "Aucun produit. Cliquez sur « Nouveau produit » pour commencer."
		}) }) : Object.entries(grouped).map(([cat, items]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
			className: "pb-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [cat, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "secondary",
					children: items.length
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "divide-y",
			children: items.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between py-3 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-medium truncate",
						children: p.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-sm text-muted-foreground",
						children: [
							p.cost > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								"Achat ",
								formatFCFA(p.cost),
								" · "
							] }),
							"Vente ",
							formatFCFA(p.price),
							p.cost > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" · Marge ", formatFCFA(p.price - p.cost)] }),
							" · Stock\xA0:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: Number.isFinite(p.stock) && p.stock <= 5 ? "text-destructive font-semibold" : "",
								children: Number.isFinite(p.stock) ? p.stock : "∞"
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						onClick: () => {
							setEditing(p);
							setOpen(true);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						onClick: () => {
							if (confirm(`Supprimer "${p.name}" ?`)) removeMut.mutate(p.id);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4 text-destructive" })
					})]
				})]
			}, p.id))
		})] }, cat))]
	});
}
function ProductForm({ editing, onClose }) {
	const qc = useQueryClient();
	const [name, setName] = (0, import_react.useState)(editing?.name ?? "");
	const [cost, setCost] = (0, import_react.useState)(editing?.cost ? String(editing.cost) : "");
	const [price, setPrice] = (0, import_react.useState)(editing ? String(editing.price) : "");
	const [unlimited, setUnlimited] = (0, import_react.useState)(editing ? !Number.isFinite(editing.stock) : false);
	const [stock, setStock] = (0, import_react.useState)(editing && Number.isFinite(editing.stock) ? String(editing.stock) : "");
	const [category, setCategory] = (0, import_react.useState)(editing?.category ?? "Boisson");
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editing ? "Modifier le produit" : "Nouveau produit" }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "name",
					children: "Nom"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "name",
					value: name,
					onChange: (e) => setName(e.target.value),
					placeholder: "Ex : Regab"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-3 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "cost",
							children: "Prix d'achat"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "cost",
							inputMode: "numeric",
							value: cost,
							onChange: (e) => setCost(e.target.value.replace(/\D/g, "")),
							placeholder: "200"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "price",
							children: "Prix de vente"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "price",
							inputMode: "numeric",
							value: price,
							onChange: (e) => setPrice(e.target.value.replace(/\D/g, "")),
							placeholder: "300"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "stock",
							children: "Stock"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "stock",
							inputMode: "numeric",
							value: stock,
							onChange: (e) => setStock(e.target.value.replace(/\D/g, "")),
							placeholder: "50",
							disabled: unlimited
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
						id: "unlimited",
						checked: unlimited,
						onCheckedChange: (v) => setUnlimited(Boolean(v))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "unlimited",
						className: "cursor-pointer",
						children: "Stock illimité (service)"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Catégorie" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: category,
					onValueChange: (v) => setCategory(v),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: c,
						children: c
					}, c)) })]
				})] })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			variant: "ghost",
			onClick: onClose,
			children: "Annuler"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			onClick: () => saveMut.mutate(),
			disabled: saveMut.isPending,
			children: "Enregistrer"
		})] })
	] });
}
//#endregion
export { StocksPage as component };
