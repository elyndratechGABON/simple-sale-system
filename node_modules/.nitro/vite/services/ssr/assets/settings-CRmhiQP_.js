import { a as pickDocumentsDirectory, c as PRESET_HUES, d as savePreferences, f as swatchColor, i as getDocumentsDirectoryName, l as applyTheme, n as describeSaveResult, o as saveDocument, r as forgetDocumentsDirectory, s as usePreferences, t as canPickDirectory } from "./files-4u0jemrE.js";
import { C as cn, S as buttonVariants, _ as replaceAllData, u as exportSnapshot, x as Button } from "./db-WliOSm7d.js";
import { n as Input, t as Label } from "./label-DXgWLoGQ.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-ChhSX-dj.js";
import { n as verifyPin, t as setPin } from "./pin-D6dTIodF.js";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, FolderOpen, KeyRound, Palette, Save, Store, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
var syncFields = {
	updated_at: z.number().optional(),
	deleted_at: z.number().optional(),
	sync_status: z.enum(["local", "synced"]).optional()
};
var category = z.enum([
	"Boisson",
	"Snack",
	"Service",
	"Autre"
]);
var productSchema = z.object({
	id: z.string(),
	name: z.string(),
	cost: z.number().optional(),
	price: z.number(),
	stock: z.number().nullable(),
	category,
	...syncFields
});
var saleSchema = z.object({
	id: z.string(),
	timestamp: z.number(),
	total: z.number(),
	cash_given: z.number(),
	change_due: z.number(),
	day_closed: z.boolean(),
	customers_count: z.number().optional(),
	...syncFields
});
var saleItemSchema = z.object({
	id: z.string(),
	sale_id: z.string(),
	product_id: z.string().optional(),
	name: z.string(),
	quantity: z.number(),
	price_at_sale: z.number(),
	cost_at_sale: z.number().optional(),
	category_at_sale: category.optional(),
	...syncFields
});
var expenseSchema = z.object({
	id: z.string(),
	timestamp: z.number(),
	label: z.string(),
	amount: z.number(),
	category: z.enum([
		"Achat",
		"Transport",
		"Salaire",
		"Loyer",
		"Autre"
	]),
	...syncFields
});
var backupSchema = z.object({
	format: z.literal("caisse-pos-backup"),
	version: z.number(),
	exportedAt: z.string().optional(),
	products: z.array(productSchema),
	sales: z.array(saleSchema),
	sale_items: z.array(saleItemSchema),
	expenses: z.array(expenseSchema).optional()
});
async function buildBackupBlob() {
	const snapshot = await exportSnapshot();
	const backup = {
		format: "caisse-pos-backup",
		version: 2,
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		...snapshot
	};
	return new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
}
function backupFilename() {
	const d = /* @__PURE__ */ new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `sauvegarde-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}
/**
* Valide un fichier et le convertit en snapshot prêt à écrire.
* Lève une erreur en français si le fichier n'est pas une sauvegarde de cette
* application — le message est affiché tel quel à l'utilisateur.
*/
function parseBackup(text) {
	let raw;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new Error("Fichier illisible : ce n'est pas du JSON.");
	}
	const parsed = backupSchema.safeParse(raw);
	if (!parsed.success) throw new Error("Ce fichier n'est pas une sauvegarde de cette application.");
	const data = parsed.data;
	if (data.version > 2) throw new Error(`Sauvegarde au format ${data.version}, trop récente pour cette version de l'application.`);
	const now = Date.now();
	const normalize = (r, fallbackTimestamp) => ({
		...r,
		updated_at: r.updated_at ?? fallbackTimestamp ?? now,
		sync_status: r.sync_status ?? "local"
	});
	const snapshot = {
		products: data.products.map((p) => ({
			...normalize(p),
			cost: p.cost ?? 0,
			stock: p.stock === null ? Number.POSITIVE_INFINITY : p.stock
		})),
		sales: data.sales.map((s) => ({
			...normalize(s, s.timestamp),
			customers_count: s.customers_count ?? 1
		})),
		sale_items: data.sale_items.map((i) => ({
			...normalize(i),
			cost_at_sale: i.cost_at_sale ?? 0
		})),
		expenses: (data.expenses ?? []).map((e) => normalize(e, e.timestamp))
	};
	return {
		snapshot,
		summary: {
			version: data.version,
			exportedAt: data.exportedAt,
			products: snapshot.products.length,
			sales: snapshot.sales.length,
			expenses: snapshot.expenses.length
		}
	};
}
/** Écrase les données métier par celles du fichier. Destructif — confirmer en amont. */
async function restoreBackup(snapshot) {
	await replaceAllData(snapshot);
}
//#endregion
//#region src/components/ui/alert-dialog.tsx
var AlertDialog = AlertDialogPrimitive.Root;
var AlertDialogPortal = AlertDialogPrimitive.Portal;
var AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(AlertDialogPrimitive.Overlay, {
	className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;
var AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs(AlertDialogPortal, { children: [/* @__PURE__ */ jsx(AlertDialogOverlay, {}), /* @__PURE__ */ jsx(AlertDialogPrimitive.Content, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(AlertDialogPrimitive.Title, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
var AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(AlertDialogPrimitive.Description, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;
var AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(AlertDialogPrimitive.Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
var AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(AlertDialogPrimitive.Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;
//#endregion
//#region src/routes/settings.tsx?tsr-split=component
function SettingsPage() {
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-3xl px-4 py-6 space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "text-2xl font-bold",
				children: "Paramètres"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground",
				children: "Tout ce qui a été demandé au premier lancement se modifie ici."
			})] }),
			/* @__PURE__ */ jsx(WorkspaceCard, {}),
			/* @__PURE__ */ jsx(ColorCard, {}),
			/* @__PURE__ */ jsx(DirectoryCard, {}),
			/* @__PURE__ */ jsx(BackupCard, {}),
			/* @__PURE__ */ jsx(PinCard, {})
		]
	});
}
function WorkspaceCard() {
	const qc = useQueryClient();
	const prefs = usePreferences();
	const [name, setName] = useState(prefs.workspaceName);
	useEffect(() => setName(prefs.workspaceName), [prefs.workspaceName]);
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(Store, { className: "h-4 w-4" }), " Espace de travail"]
	}), /* @__PURE__ */ jsx(CardDescription, { children: "Affiché dans l'en-tête et en tête des documents exportés." })] }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-3",
		children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
			htmlFor: "ws-name",
			children: "Nom de l'entreprise"
		}), /* @__PURE__ */ jsx(Input, {
			id: "ws-name",
			value: name,
			onChange: (e) => setName(e.target.value)
		})] }), /* @__PURE__ */ jsx(Button, {
			onClick: () => {
				const trimmed = name.trim();
				if (!trimmed) {
					toast.error("Le nom ne peut pas être vide");
					return;
				}
				savePreferences({ workspaceName: trimmed });
				qc.invalidateQueries({ queryKey: ["preferences"] });
				toast.success("Nom enregistré");
			},
			children: "Enregistrer"
		})]
	})] });
}
function ColorCard() {
	const qc = useQueryClient();
	const prefs = usePreferences();
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(Palette, { className: "h-4 w-4" }), " Couleur principale"]
	}), /* @__PURE__ */ jsx(CardDescription, { children: "Boutons, totaux et graphiques. Le changement est immédiat et conservé." })] }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", {
		className: "grid grid-cols-5 sm:grid-cols-9 gap-3",
		children: PRESET_HUES.map((p) => /* @__PURE__ */ jsx("button", {
			type: "button",
			"aria-label": p.label,
			"aria-pressed": prefs.hue === p.hue,
			onClick: () => {
				applyTheme(p.hue);
				savePreferences({ hue: p.hue });
				qc.invalidateQueries({ queryKey: ["preferences"] });
			},
			className: cn("aspect-square rounded-xl border-2 transition-transform flex items-center justify-center", prefs.hue === p.hue ? "border-foreground scale-105" : "border-transparent hover:scale-105"),
			style: { backgroundColor: swatchColor(p.hue) },
			children: prefs.hue === p.hue && /* @__PURE__ */ jsx(Check, { className: "h-5 w-5 text-white drop-shadow" })
		}, p.hue))
	}) })] });
}
function DirectoryCard() {
	const [canPick, setCanPick] = useState(false);
	useEffect(() => setCanPick(canPickDirectory()), []);
	const { data: directory, refetch } = useQuery({
		queryKey: ["settings", "documents_dir"],
		queryFn: getDocumentsDirectoryName
	});
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(FolderOpen, { className: "h-4 w-4" }), " Dossier des documents"]
	}), /* @__PURE__ */ jsx(CardDescription, { children: "Destination des rapports, exports et sauvegardes lorsque la plateforme le permet." })] }), /* @__PURE__ */ jsx(CardContent, {
		className: "space-y-3",
		children: canPick ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap gap-2",
			children: [/* @__PURE__ */ jsxs(Button, {
				variant: "secondary",
				onClick: async () => {
					const picked = await pickDocumentsDirectory();
					if (picked) toast.success(`Documents enregistrés dans « ${picked} »`);
					refetch();
				},
				children: [/* @__PURE__ */ jsx(FolderOpen, { className: "h-4 w-4 mr-2" }), directory ? "Changer de dossier" : "Choisir un dossier"]
			}), directory && /* @__PURE__ */ jsx(Button, {
				variant: "ghost",
				onClick: async () => {
					await forgetDocumentsDirectory();
					toast.success("Dossier oublié");
					refetch();
				},
				children: "Oublier"
			})]
		}), /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground",
			children: directory ? `Dossier actuel : « ${directory} »` : "Sans dossier, les fichiers vont dans Téléchargements."
		})] }) : /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground",
			children: "Ce navigateur ne permet pas de choisir un dossier. Les documents sont proposés au partage ou enregistrés dans Téléchargements. L'application Android écrit directement dans Documents."
		})
	})] });
}
function BackupCard() {
	const qc = useQueryClient();
	const fileRef = useRef(null);
	const [pending, setPending] = useState(null);
	const saveMut = useMutation({
		mutationFn: async () => {
			const blob = await buildBackupBlob();
			const filename = backupFilename();
			return {
				result: await saveDocument(blob, filename),
				filename
			};
		},
		onSuccess: ({ result, filename }) => toast.success(describeSaveResult(result, filename)),
		onError: (e) => toast.error(e.message)
	});
	const restoreMut = useMutation({
		mutationFn: async (snapshot) => restoreBackup(snapshot),
		onSuccess: () => {
			qc.invalidateQueries();
			setPending(null);
			toast.success("Sauvegarde restaurée");
		},
		onError: (e) => toast.error(e.message)
	});
	async function onFile(file) {
		try {
			setPending(parseBackup(await file.text()));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Fichier invalide");
		} finally {
			if (fileRef.current) fileRef.current.value = "";
		}
	}
	return /* @__PURE__ */ jsxs(Card, { children: [
		/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs(CardTitle, {
			className: "text-base flex items-center gap-2",
			children: [/* @__PURE__ */ jsx(Save, { className: "h-4 w-4" }), " Sauvegarde et restauration"]
		}), /* @__PURE__ */ jsx(CardDescription, { children: "La sauvegarde contient toute la base : produits, ventes, lignes et dépenses." })] }),
		/* @__PURE__ */ jsxs(CardContent, {
			className: "space-y-3",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ jsxs(Button, {
						onClick: () => saveMut.mutate(),
						disabled: saveMut.isPending,
						children: [/* @__PURE__ */ jsx(Save, { className: "h-4 w-4 mr-2" }), " Sauvegarder"]
					}),
					/* @__PURE__ */ jsxs(Button, {
						variant: "outline",
						onClick: () => fileRef.current?.click(),
						children: [/* @__PURE__ */ jsx(Upload, { className: "h-4 w-4 mr-2" }), " Restaurer un fichier"]
					}),
					/* @__PURE__ */ jsx("input", {
						ref: fileRef,
						type: "file",
						accept: "application/json,.json",
						className: "hidden",
						onChange: (e) => {
							const file = e.target.files?.[0];
							if (file) onFile(file);
						}
					})
				]
			}), /* @__PURE__ */ jsx("p", {
				className: "text-xs text-muted-foreground",
				children: "Les préférences (nom, couleur, dossier, PIN) ne sont pas incluses : elles sont propres à cet appareil."
			})]
		}),
		/* @__PURE__ */ jsx(AlertDialog, {
			open: pending !== null,
			onOpenChange: (v) => !v && setPending(null),
			children: /* @__PURE__ */ jsxs(AlertDialogContent, { children: [/* @__PURE__ */ jsxs(AlertDialogHeader, { children: [/* @__PURE__ */ jsxs(AlertDialogTitle, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5 text-destructive" }), " Restaurer cette sauvegarde ?"]
			}), /* @__PURE__ */ jsx(AlertDialogDescription, {
				asChild: true,
				children: /* @__PURE__ */ jsxs("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ jsxs("p", { children: [
						"Toutes les données actuelles seront ",
						/* @__PURE__ */ jsx("strong", { children: "définitivement remplacées" }),
						" par le contenu du fichier. Cette action est irréversible."
					] }), pending && /* @__PURE__ */ jsxs("ul", {
						className: "text-sm space-y-0.5",
						children: [
							/* @__PURE__ */ jsxs("li", { children: [pending.summary.products, " produit(s)"] }),
							/* @__PURE__ */ jsxs("li", { children: [pending.summary.sales, " vente(s)"] }),
							/* @__PURE__ */ jsxs("li", { children: [pending.summary.expenses, " dépense(s)"] }),
							pending.summary.exportedAt && /* @__PURE__ */ jsxs("li", {
								className: "text-muted-foreground",
								children: ["Sauvegarde du ", new Date(pending.summary.exportedAt).toLocaleString("fr-FR")]
							})
						]
					})]
				})
			})] }), /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [/* @__PURE__ */ jsx(AlertDialogCancel, { children: "Annuler" }), /* @__PURE__ */ jsx(AlertDialogAction, {
				onClick: () => pending && restoreMut.mutate(pending.snapshot),
				disabled: restoreMut.isPending,
				children: "Remplacer mes données"
			})] })] })
		})
	] });
}
function PinCard() {
	const [oldPin, setOldPin] = useState("");
	const [newPin, setNewPin] = useState("");
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(KeyRound, { className: "h-4 w-4" }), " Code PIN"]
	}), /* @__PURE__ */ jsxs(CardDescription, { children: [
		"Protège l'annulation d'une vente. PIN par défaut : ",
		/* @__PURE__ */ jsx("code", { children: "1234" }),
		"."
	] })] }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-3",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
				htmlFor: "old",
				children: "PIN actuel"
			}), /* @__PURE__ */ jsx(Input, {
				id: "old",
				type: "password",
				inputMode: "numeric",
				value: oldPin,
				onChange: (e) => setOldPin(e.target.value)
			})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
				htmlFor: "new",
				children: "Nouveau PIN"
			}), /* @__PURE__ */ jsx(Input, {
				id: "new",
				type: "password",
				inputMode: "numeric",
				value: newPin,
				onChange: (e) => setNewPin(e.target.value)
			})] })]
		}), /* @__PURE__ */ jsx(Button, {
			onClick: () => {
				if (!verifyPin(oldPin)) {
					toast.error("PIN actuel incorrect");
					return;
				}
				if (newPin.length < 4) {
					toast.error("Nouveau PIN : au moins 4 caractères");
					return;
				}
				setPin(newPin);
				toast.success("PIN mis à jour");
				setOldPin("");
				setNewPin("");
			},
			children: "Modifier le PIN"
		})]
	})] });
}
//#endregion
export { SettingsPage as component };
