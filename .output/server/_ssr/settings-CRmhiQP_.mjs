import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime, a as Overlay2, c as Title2, i as Description2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { b as replaceAllData, l as cn, o as buttonVariants, p as exportSnapshot, t as Button } from "./db-WliOSm7d.mjs";
import { D as Check, f as Palette, g as KeyRound, i as TriangleAlert, l as Save, o as Store, r as Upload, v as FolderOpen } from "../_libs/lucide-react.mjs";
import { n as Label, t as Input } from "./label-DXgWLoGQ.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-ChhSX-dj.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as numberType, i as literalType, n as booleanType, o as objectType, r as enumType, s as stringType, t as arrayType } from "../_libs/zod.mjs";
import { n as verifyPin, t as setPin } from "./pin-D6dTIodF.mjs";
import { a as forgetDocumentsDirectory, c as pickDocumentsDirectory, d as swatchColor, f as usePreferences, i as describeSaveResult, l as saveDocument, n as applyTheme, o as getDocumentsDirectoryName, r as canPickDirectory, t as PRESET_HUES, u as savePreferences } from "./files-4u0jemrE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-CRmhiQP_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var syncFields = {
	updated_at: numberType().optional(),
	deleted_at: numberType().optional(),
	sync_status: enumType(["local", "synced"]).optional()
};
var category = enumType([
	"Boisson",
	"Snack",
	"Service",
	"Autre"
]);
var productSchema = objectType({
	id: stringType(),
	name: stringType(),
	cost: numberType().optional(),
	price: numberType(),
	stock: numberType().nullable(),
	category,
	...syncFields
});
var saleSchema = objectType({
	id: stringType(),
	timestamp: numberType(),
	total: numberType(),
	cash_given: numberType(),
	change_due: numberType(),
	day_closed: booleanType(),
	customers_count: numberType().optional(),
	...syncFields
});
var saleItemSchema = objectType({
	id: stringType(),
	sale_id: stringType(),
	product_id: stringType().optional(),
	name: stringType(),
	quantity: numberType(),
	price_at_sale: numberType(),
	cost_at_sale: numberType().optional(),
	category_at_sale: category.optional(),
	...syncFields
});
var expenseSchema = objectType({
	id: stringType(),
	timestamp: numberType(),
	label: stringType(),
	amount: numberType(),
	category: enumType([
		"Achat",
		"Transport",
		"Salaire",
		"Loyer",
		"Autre"
	]),
	...syncFields
});
var backupSchema = objectType({
	format: literalType("caisse-pos-backup"),
	version: numberType(),
	exportedAt: stringType().optional(),
	products: arrayType(productSchema),
	sales: arrayType(saleSchema),
	sale_items: arrayType(saleItemSchema),
	expenses: arrayType(expenseSchema).optional()
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
var AlertDialog = Root2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
function SettingsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-3xl px-4 py-6 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Paramètres"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Tout ce qui a été demandé au premier lancement se modifie ici."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DirectoryCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackupCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinCard, {})
		]
	});
}
function WorkspaceCard() {
	const qc = useQueryClient();
	const prefs = usePreferences();
	const [name, setName] = (0, import_react.useState)(prefs.workspaceName);
	(0, import_react.useEffect)(() => setName(prefs.workspaceName), [prefs.workspaceName]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "h-4 w-4" }), " Espace de travail"]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Affiché dans l'en-tête et en tête des documents exportés." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			htmlFor: "ws-name",
			children: "Nom de l'entreprise"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			id: "ws-name",
			value: name,
			onChange: (e) => setName(e.target.value)
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Palette, { className: "h-4 w-4" }), " Couleur principale"]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Boutons, totaux et graphiques. Le changement est immédiat et conservé." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-5 sm:grid-cols-9 gap-3",
		children: PRESET_HUES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
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
			children: prefs.hue === p.hue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-5 w-5 text-white drop-shadow" })
		}, p.hue))
	}) })] });
}
function DirectoryCard() {
	const [canPick, setCanPick] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setCanPick(canPickDirectory()), []);
	const { data: directory, refetch } = useQuery({
		queryKey: ["settings", "documents_dir"],
		queryFn: getDocumentsDirectoryName
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "h-4 w-4" }), " Dossier des documents"]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Destination des rapports, exports et sauvegardes lorsque la plateforme le permet." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
		className: "space-y-3",
		children: canPick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "secondary",
				onClick: async () => {
					const picked = await pickDocumentsDirectory();
					if (picked) toast.success(`Documents enregistrés dans « ${picked} »`);
					refetch();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "h-4 w-4 mr-2" }), directory ? "Changer de dossier" : "Choisir un dossier"]
			}), directory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: async () => {
					await forgetDocumentsDirectory();
					toast.success("Dossier oublié");
					refetch();
				},
				children: "Oublier"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: directory ? `Dossier actuel : « ${directory} »` : "Sans dossier, les fichiers vont dans Téléchargements."
		})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "Ce navigateur ne permet pas de choisir un dossier. Les documents sont proposés au partage ou enregistrés dans Téléchargements. L'application Android écrit directement dans Documents."
		})
	})] });
}
function BackupCard() {
	const qc = useQueryClient();
	const fileRef = (0, import_react.useRef)(null);
	const [pending, setPending] = (0, import_react.useState)(null);
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
			className: "text-base flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), " Sauvegarde et restauration"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "La sauvegarde contient toute la base : produits, ventes, lignes et dépenses." })] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => saveMut.mutate(),
						disabled: saveMut.isPending,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4 mr-2" }), " Sauvegarder"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: () => fileRef.current?.click(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-4 w-4 mr-2" }), " Restaurer un fichier"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
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
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Les préférences (nom, couleur, dossier, PIN) ne sont pas incluses : elles sont propres à cet appareil."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
			open: pending !== null,
			onOpenChange: (v) => !v && setPending(null),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-5 w-5 text-destructive" }), " Restaurer cette sauvegarde ?"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Toutes les données actuelles seront ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "définitivement remplacées" }),
						" par le contenu du fichier. Cette action est irréversible."
					] }), pending && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "text-sm space-y-0.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [pending.summary.products, " produit(s)"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [pending.summary.sales, " vente(s)"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [pending.summary.expenses, " dépense(s)"] }),
							pending.summary.exportedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "text-muted-foreground",
								children: ["Sauvegarde du ", new Date(pending.summary.exportedAt).toLocaleString("fr-FR")]
							})
						]
					})]
				})
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Annuler" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
				onClick: () => pending && restoreMut.mutate(pending.snapshot),
				disabled: restoreMut.isPending,
				children: "Remplacer mes données"
			})] })] })
		})
	] });
}
function PinCard() {
	const [oldPin, setOldPin] = (0, import_react.useState)("");
	const [newPin, setNewPin] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
		className: "text-base flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" }), " Code PIN"]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
		"Protège l'annulation d'une vente. PIN par défaut : ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "1234" }),
		"."
	] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "old",
				children: "PIN actuel"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "old",
				type: "password",
				inputMode: "numeric",
				value: oldPin,
				onChange: (e) => setOldPin(e.target.value)
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "new",
				children: "Nouveau PIN"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "new",
				type: "password",
				inputMode: "numeric",
				value: newPin,
				onChange: (e) => setNewPin(e.target.value)
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
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
