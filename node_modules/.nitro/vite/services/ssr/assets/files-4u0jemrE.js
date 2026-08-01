import { p as getSetting, v as setSetting } from "./db-WliOSm7d.js";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
//#region src/lib/settings.ts
var KEY = "pos_preferences";
var DEFAULT_PREFERENCES = {
	workspaceName: "Ma boutique",
	hue: 155,
	onboarded: false
};
/**
* Couleurs proposées à l'onboarding et dans les paramètres.
*
* Ce sont des TEINTES, pas des couleurs complètes : voir `applyTheme` pour la raison.
*/
var PRESET_HUES = [
	{
		label: "Vert",
		hue: 155
	},
	{
		label: "Émeraude",
		hue: 175
	},
	{
		label: "Bleu",
		hue: 240
	},
	{
		label: "Indigo",
		hue: 275
	},
	{
		label: "Violet",
		hue: 310
	},
	{
		label: "Rose",
		hue: 350
	},
	{
		label: "Rouge",
		hue: 25
	},
	{
		label: "Orange",
		hue: 60
	},
	{
		label: "Ocre",
		hue: 95
	}
];
function getPreferences() {
	if (typeof window === "undefined") return DEFAULT_PREFERENCES;
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return DEFAULT_PREFERENCES;
		const parsed = JSON.parse(raw);
		return {
			workspaceName: parsed.workspaceName?.trim() || DEFAULT_PREFERENCES.workspaceName,
			hue: normalizeHue(parsed.hue),
			onboarded: parsed.onboarded === true
		};
	} catch {
		return DEFAULT_PREFERENCES;
	}
}
function savePreferences(patch) {
	const next = {
		...getPreferences(),
		...patch
	};
	if (typeof window !== "undefined") try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {}
	return next;
}
function normalizeHue(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return DEFAULT_PREFERENCES.hue;
	return (n % 360 + 360) % 360;
}
/**
* Applique la couleur principale en réécrivant les tokens de src/styles.css sur
* `document.documentElement`.
*
* On ne stocke qu'une TEINTE, pas une couleur complète, et c'est délibéré : toute la
* palette claire de styles.css est construite sur la teinte 155 avec des couples
* clarté/chroma accordés entre eux (primaire soutenu, accent pâle, texte sur accent
* foncé). Faire tourner la seule teinte préserve ces rapports — donc les contrastes —
* alors que laisser choisir un `#rrggbb` arbitraire pour `--primary` casserait la
* lisibilité du texte posé dessus dès que l'utilisateur prend un jaune vif.
*
* Les écarts de teinte des graphiques (+15, +45, −55, −95) reproduisent ceux déjà
* codés en dur dans styles.css. Ne pas les « arrondir » : ils sont ce qui rend les
* cinq séries distinguables.
*/
function applyTheme(hue) {
	if (typeof document === "undefined") return;
	const h = normalizeHue(hue);
	const rot = (delta) => ((h + delta) % 360 + 360) % 360;
	const tokens = {
		"--primary": `oklch(0.55 0.15 ${h})`,
		"--primary-foreground": `oklch(0.99 0.005 ${h})`,
		"--secondary": `oklch(0.95 0.02 ${h})`,
		"--secondary-foreground": `oklch(0.25 0.05 ${h})`,
		"--accent": `oklch(0.93 0.05 ${h})`,
		"--accent-foreground": `oklch(0.25 0.08 ${h})`,
		"--ring": `oklch(0.55 0.15 ${h})`,
		"--background": `oklch(0.985 0.005 ${rot(-35)})`,
		"--muted": `oklch(0.96 0.008 ${rot(-5)})`,
		"--border": `oklch(0.9 0.015 ${rot(-5)})`,
		"--input": `oklch(0.9 0.015 ${rot(-5)})`,
		"--chart-1": `oklch(0.55 0.15 ${h})`,
		"--chart-2": `oklch(0.7 0.14 ${rot(15)})`,
		"--chart-3": `oklch(0.62 0.13 ${rot(45)})`,
		"--chart-4": `oklch(0.75 0.15 ${rot(-55)})`,
		"--chart-5": `oklch(0.68 0.14 ${rot(-95)})`
	};
	for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(name, value);
	document.querySelector("meta[name=\"theme-color\"]")?.setAttribute("content", `oklch(0.55 0.15 ${h})`);
}
/** Couleur d'aperçu d'une pastille de choix, sans toucher au document. */
var swatchColor = (hue) => `oklch(0.55 0.15 ${hue})`;
//#endregion
//#region src/hooks/use-preferences.ts
/**
* Préférences utilisateur, relues à la demande.
*
* Passer par React Query plutôt que par un contexte React n'est pas gratuit : c'est ce
* qui permet à /settings de rafraîchir l'en-tête d'un simple
* `invalidateQueries({ queryKey: ["preferences"] })`, sans câbler de state global.
*
* La lecture se fait dans `queryFn`, donc après montage : `getPreferences()` touche
* localStorage, indisponible au rendu serveur. Le premier rendu utilise les défauts.
*/
function usePreferences() {
	const { data } = useQuery({
		queryKey: ["preferences"],
		queryFn: async () => getPreferences(),
		staleTime: Infinity
	});
	return data ?? DEFAULT_PREFERENCES;
}
//#endregion
//#region src/lib/files.ts
var DIR_HANDLE_KEY = "documents_dir_handle";
/** Le picker de dossier n'est proposé que là où il existe réellement. */
function canPickDirectory() {
	if (typeof window === "undefined") return false;
	if (Capacitor.isNativePlatform()) return false;
	return typeof window.showDirectoryPicker === "function";
}
/** Ouvre le sélecteur et mémorise le dossier choisi. Renvoie son nom, ou null si annulé. */
async function pickDocumentsDirectory() {
	const picker = window.showDirectoryPicker;
	if (!picker) return null;
	try {
		const handle = await picker({ mode: "readwrite" });
		await setSetting(DIR_HANDLE_KEY, handle);
		return handle.name;
	} catch {
		return null;
	}
}
async function getDocumentsDirectoryName() {
	return (await getSetting(DIR_HANDLE_KEY))?.name ?? null;
}
async function forgetDocumentsDirectory() {
	await setSetting(DIR_HANDLE_KEY, void 0);
}
/**
* Récupère le dossier mémorisé si l'autorisation tient toujours.
* Les handles sont structured-cloneable, donc persistables dans IndexedDB — mais
* l'autorisation, elle, doit être revalidée à chaque session.
*/
async function getGrantedDirectory() {
	const handle = await getSetting(DIR_HANDLE_KEY) ?? null;
	if (!handle) return null;
	try {
		const state = await handle.queryPermission?.({ mode: "readwrite" }) ?? "granted";
		if (state === "granted") return handle;
		if (state === "denied") return null;
		return (await handle.requestPermission?.({ mode: "readwrite" }) ?? "denied") === "granted" ? handle : null;
	} catch {
		return null;
	}
}
async function blobToBase64(blob) {
	const buffer = new Uint8Array(await blob.arrayBuffer());
	let binary = "";
	const CHUNK = 32768;
	for (let i = 0; i < buffer.length; i += CHUNK) binary += String.fromCharCode(...buffer.subarray(i, i + CHUNK));
	return btoa(binary);
}
async function saveDocument(blob, filename) {
	if (Capacitor.isNativePlatform()) {
		const { Filesystem, Directory } = await import("@capacitor/filesystem");
		return {
			method: "capacitor",
			location: (await Filesystem.writeFile({
				path: filename,
				data: await blobToBase64(blob),
				directory: Directory.Documents,
				recursive: true
			})).uri
		};
	}
	const dir = await getGrantedDirectory();
	if (dir) {
		const writable = await (await dir.getFileHandle(filename, { create: true })).createWritable();
		await writable.write(blob);
		await writable.close();
		return {
			method: "directory",
			location: dir.name
		};
	}
	const file = new File([blob], filename, { type: blob.type });
	if (navigator.canShare?.({ files: [file] })) try {
		await navigator.share({
			files: [file],
			title: filename
		});
		return { method: "share" };
	} catch {}
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1e3);
	return { method: "download" };
}
function describeSaveResult(result, filename) {
	switch (result.method) {
		case "capacitor": return `${filename} enregistré dans Documents`;
		case "directory": return `${filename} enregistré dans « ${result.location} »`;
		case "share": return `${filename} partagé`;
		case "download": return `${filename} téléchargé`;
	}
}
//#endregion
export { pickDocumentsDirectory as a, PRESET_HUES as c, savePreferences as d, swatchColor as f, getDocumentsDirectoryName as i, applyTheme as l, describeSaveResult as n, saveDocument as o, forgetDocumentsDirectory as r, usePreferences as s, canPickDirectory as t, getPreferences as u };
