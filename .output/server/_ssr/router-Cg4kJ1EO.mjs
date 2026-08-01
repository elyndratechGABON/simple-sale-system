import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { l as cn, t as Button } from "./db-WliOSm7d.mjs";
import { D as Check, O as ChartColumn, T as ChevronLeft, _ as History, c as Settings, f as Palette, n as Wallet, o as Store, p as Package, s as ShoppingCart, v as FolderOpen, w as ChevronRight, x as Download } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-DTAGyVAm.mjs";
import { n as Label, t as Input } from "./label-DXgWLoGQ.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { r as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { o as objectType, r as enumType, s as stringType } from "../_libs/zod.mjs";
import { _ as useRouter, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, k as redirect, l as useRouterState, m as createFileRoute, p as lazyRouteComponent, s as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as MotionConfig, r as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { c as pickDocumentsDirectory, d as swatchColor, f as usePreferences, n as applyTheme, r as canPickDirectory, s as getPreferences, t as PRESET_HUES, u as savePreferences } from "./files-4u0jemrE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-Cg4kJ1EO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-C19GPCIz.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var links = [
	{
		to: "/pos",
		label: "Caisse",
		icon: ShoppingCart
	},
	{
		to: "/stocks",
		label: "Stocks",
		icon: Package
	},
	{
		to: "/expenses",
		label: "Dépenses",
		icon: Wallet
	},
	{
		to: "/history",
		label: "Historique",
		icon: History
	},
	{
		to: "/reports",
		label: "Rapports",
		icon: ChartColumn
	},
	{
		to: "/settings",
		label: "Réglages",
		icon: Settings
	}
];
function Header() {
	const { workspaceName } = usePreferences();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "border-b bg-card sticky top-0 z-20",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/pos",
				className: "flex items-center gap-2 font-bold text-lg min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-md bg-primary px-2 py-1 text-primary-foreground shrink-0",
					children: "POS"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden sm:inline truncate text-foreground",
					children: workspaceName
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex items-center gap-1",
				children: links.map((l) => {
					const Icon = l.icon;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: l.to,
						title: l.label,
						className: "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
						activeProps: { className: "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden lg:inline",
							children: l.label
						})]
					}, l.to);
				})
			})]
		})
	});
}
function isStandalone() {
	if (typeof window === "undefined") return false;
	if (navigator.standalone) return true;
	return window.matchMedia("(display-mode: standalone)").matches;
}
function isIOS() {
	if (typeof window === "undefined") return false;
	return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function registerServiceWorker() {
	if (typeof window === "undefined") return;
	if (!("serviceWorker" in navigator)) return;
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch((error) => {
			console.error("Service worker registration failed", error);
		});
	});
}
async function requestPersistentStorage() {
	if (typeof navigator === "undefined") return false;
	if (!navigator.storage?.persist) return false;
	try {
		const granted = await navigator.storage.persist();
		if (!granted) {
			const estimate = await navigator.storage.estimate().catch(() => null);
			if (estimate) console.info("IndexedDB storage usage", estimate);
		}
		return granted;
	} catch (error) {
		console.error("Storage persistence request failed", error);
		return false;
	}
}
function PwaInstall() {
	const [prompt, setPrompt] = (0, import_react.useState)(null);
	const [installed, setInstalled] = (0, import_react.useState)(false);
	const [showIosHelp, setShowIosHelp] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		registerServiceWorker();
		requestPersistentStorage();
		if (isStandalone()) {
			setInstalled(true);
			return;
		}
		const onPrompt = (e) => {
			e.preventDefault();
			setPrompt(e);
		};
		const onInstalled = () => setInstalled(true);
		const onDisplayMode = (e) => {
			if (e.matches) setInstalled(true);
		};
		window.addEventListener("beforeinstallprompt", onPrompt);
		window.addEventListener("appinstalled", onInstalled);
		const mql = window.matchMedia("(display-mode: standalone)");
		mql.addEventListener("change", onDisplayMode);
		return () => {
			window.removeEventListener("beforeinstallprompt", onPrompt);
			window.removeEventListener("appinstalled", onInstalled);
			mql.removeEventListener("change", onDisplayMode);
		};
	}, []);
	const canInstall = prompt !== null || isIOS();
	if (installed || isStandalone() || !canInstall) return null;
	async function handleInstall() {
		if (prompt) {
			if ((await prompt.prompt().then(() => prompt.userChoice)).outcome === "accepted") setInstalled(true);
			return;
		}
		if (isIOS()) setShowIosHelp(true);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		size: "lg",
		onClick: handleInstall,
		"aria-label": "Télécharger l'application",
		className: "fixed bottom-4 right-4 z-40 rounded-full shadow-lg gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-5 w-5" }), "Télécharger l'app"]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: showIosHelp,
		onOpenChange: setShowIosHelp,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Installer l'application" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Sur iPhone/iPad : ouvrez le menu Partager dans Safari, puis choisissez « Ajouter à l'écran d'accueil »." })] }) })
	})] });
}
var STEPS = [
	"Espace de travail",
	"Couleur",
	"Documents"
];
function Onboarding() {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [step, setStep] = (0, import_react.useState)(0);
	const [name, setName] = (0, import_react.useState)("");
	const [hue, setHue] = (0, import_react.useState)(PRESET_HUES[0].hue);
	const [directory, setDirectory] = (0, import_react.useState)(null);
	const [canPick, setCanPick] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const prefs = getPreferences();
		setName(prefs.workspaceName);
		setHue(prefs.hue);
		setCanPick(canPickDirectory());
		if (!prefs.onboarded) setOpen(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (open) applyTheme(hue);
	}, [hue, open]);
	function finish() {
		savePreferences({
			workspaceName: name.trim() || getPreferences().workspaceName,
			hue,
			onboarded: true
		});
		applyTheme(hue);
		setOpen(false);
	}
	function skip() {
		savePreferences({ onboarded: true });
		setOpen(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			showCloseButton: false,
			onEscapeKeyDown: (e) => e.preventDefault(),
			onInteractOutside: (e) => e.preventDefault(),
			className: "sm:max-w-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "sr-only",
					children: "Configuration de l'application"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-2",
					children: STEPS.map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("mt-1.5 block text-xs", i === step ? "font-medium text-foreground" : "text-muted-foreground"),
							children: label
						})]
					}, label))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-h-[240px] py-2",
					children: [
						step === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StepShell, {
							icon: Store,
							title: "Bienvenue",
							description: "Quel est le nom de votre commerce ? Il apparaîtra dans l'application et en tête de vos documents exportés.",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "ob-name",
								children: "Nom de l'entreprise"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "ob-name",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "Ex : Alimentation Chez Marie",
								className: "h-12 text-lg",
								autoFocus: true,
								onKeyDown: (e) => {
									if (e.key === "Enter") setStep(1);
								}
							})]
						}),
						step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepShell, {
							icon: Palette,
							title: "Couleur principale",
							description: "Elle habille les boutons, les totaux et les graphiques. L'aperçu est immédiat.",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-5 gap-3",
								children: PRESET_HUES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setHue(p.hue),
									"aria-label": p.label,
									"aria-pressed": hue === p.hue,
									className: cn("aspect-square rounded-xl border-2 transition-transform flex items-center justify-center", hue === p.hue ? "border-foreground scale-105" : "border-transparent hover:scale-105"),
									style: { backgroundColor: swatchColor(p.hue) },
									children: hue === p.hue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-5 w-5 text-white drop-shadow" })
								}, p.hue))
							})
						}),
						step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepShell, {
							icon: FolderOpen,
							title: "Dossier des documents",
							description: "Rapports, exports et sauvegardes y seront enregistrés automatiquement.",
							children: canPick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "secondary",
									className: "w-full h-12",
									onClick: async () => {
										const picked = await pickDocumentsDirectory();
										if (picked) setDirectory(picked);
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "h-4 w-4 mr-2" }), directory ? "Changer de dossier" : "Choisir un dossier"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: directory ? `Dossier choisi : « ${directory} ». L'autorisation d'écriture est accordée.` : "Facultatif. Sans dossier, les fichiers partent dans Téléchargements."
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: "Sur cet appareil, le navigateur ne permet pas de choisir un dossier. Vos documents seront proposés au partage ou enregistrés dans Téléchargements. L'application Android, elle, écrit directement dans le dossier Documents."
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 border-t pt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: skip,
						children: "Passer"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [step > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => setStep((s) => s - 1),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4 mr-1" }), " Retour"]
						}), step < STEPS.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => setStep((s) => s + 1),
							children: ["Suivant ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 ml-1" })]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: finish,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 mr-1" }), " Terminer"]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center text-xs text-muted-foreground",
					children: "Tout est modifiable plus tard dans Paramètres."
				})
			]
		})
	});
}
function StepShell({ icon: Icon, title, description, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "rounded-lg bg-accent p-2 text-accent-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-semibold",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: description
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children
		})]
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$7 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Caisse POS — Ventes, stocks et monnaie" },
			{
				name: "description",
				content: "Application de caisse simple et hors-ligne : gestion des stocks, prise de commande, calcul de la monnaie à rendre et historique des ventes."
			},
			{
				name: "author",
				content: "Lovable"
			},
			{
				property: "og:title",
				content: "Caisse POS — Ventes, stocks et monnaie"
			},
			{
				property: "og:description",
				content: "Prenez vos commandes, calculez la monnaie et suivez vos stocks en temps réel."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "theme-color",
				content: "#059669"
			},
			{
				name: "mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "default"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "fr",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$7.useRouteContext();
	(0, import_react.useEffect)(() => {
		applyTheme(getPreferences().hue);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MotionConfig, {
			reducedMotion: "user",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-h-screen flex flex-col",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
						className: "flex-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteTransition, {})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Onboarding, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PwaInstall, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
					richColors: true,
					position: "top-center"
				})
			]
		})
	});
}
/**
* Fondu-glissé entre les routes.
*
* `mode="wait"` : sans lui les deux écrans se superposeraient une fraction de seconde,
* et sur la caisse cela ferait clignoter le total. `initial={false}` : le premier rendu
* ne s'anime pas — animer l'arrivée sur la page ferait perdre au démarrage le temps que
* le rendu serveur vient de gagner.
*/
function RouteTransition() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
		mode: "wait",
		initial: false,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: {
				opacity: 0,
				y: 8
			},
			animate: {
				opacity: 1,
				y: 0
			},
			exit: {
				opacity: 0,
				y: -8
			},
			transition: {
				duration: .18,
				ease: "easeOut"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
		}, pathname)
	});
}
var Route$6 = createFileRoute("/")({ beforeLoad: () => {
	throw redirect({ to: "/pos" });
} });
var $$splitComponentImporter$5 = () => import("./expenses-BkI00wC5.mjs");
var Route$5 = createFileRoute("/expenses")({
	head: () => ({ meta: [{ title: "Dépenses — Caisse POS" }, {
		name: "description",
		content: "Enregistrez loyer, transport, salaires et autres sorties d'argent pour suivre votre bénéfice net."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
objectType({
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
var $$splitComponentImporter$4 = () => import("./history-BTZc0c0-.mjs");
var Route$4 = createFileRoute("/history")({
	head: () => ({ meta: [{ title: "Historique des ventes — Caisse POS" }, {
		name: "description",
		content: "Toutes les ventes enregistrées, groupées par jour, avec annulation."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./pos-Qtn8hxMs.mjs");
var Route$3 = createFileRoute("/pos")({
	head: () => ({ meta: [{ title: "Caisse — Nouvelle commande" }, {
		name: "description",
		content: "Prenez la commande, sélectionnez les articles et calculez la monnaie à rendre au client."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./reports-BJ2SOYm5.mjs");
var Route$2 = createFileRoute("/reports")({
	head: () => ({ meta: [{ title: "Rapports & clôture — Caisse POS" }, {
		name: "description",
		content: "Analyse des ventes par période, revenus contre bénéfices, exports CSV, Excel et PDF."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./settings-CRmhiQP_.mjs");
var Route$1 = createFileRoute("/settings")({
	head: () => ({ meta: [{ title: "Paramètres — Caisse POS" }, {
		name: "description",
		content: "Nom du commerce, couleur de l'application, dossier des documents, code PIN, sauvegarde et restauration."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./stocks-BtLz6tOY.mjs");
var Route = createFileRoute("/stocks")({
	head: () => ({ meta: [{ title: "Stocks & Produits — Caisse POS" }, {
		name: "description",
		content: "Ajoutez et gérez vos produits, prix et stocks."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var rootRouteChildren = {
	IndexRoute: Route$6.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$7
	}),
	ExpensesRoute: Route$5.update({
		id: "/expenses",
		path: "/expenses",
		getParentRoute: () => Route$7
	}),
	HistoryRoute: Route$4.update({
		id: "/history",
		path: "/history",
		getParentRoute: () => Route$7
	}),
	PosRoute: Route$3.update({
		id: "/pos",
		path: "/pos",
		getParentRoute: () => Route$7
	}),
	ReportsRoute: Route$2.update({
		id: "/reports",
		path: "/reports",
		getParentRoute: () => Route$7
	}),
	SettingsRoute: Route$1.update({
		id: "/settings",
		path: "/settings",
		getParentRoute: () => Route$7
	}),
	StocksRoute: Route.update({
		id: "/stocks",
		path: "/stocks",
		getParentRoute: () => Route$7
	})
};
var routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
