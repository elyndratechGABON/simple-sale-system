import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as Slot, N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as Dexie } from "../_libs/dexie+unenv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/db-WliOSm7d.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var CATEGORIES = [
	"Boisson",
	"Snack",
	"Service",
	"Autre"
];
var EXPENSE_CATEGORIES = [
	"Achat",
	"Transport",
	"Salaire",
	"Loyer",
	"Autre"
];
var PosDatabase = class extends Dexie {
	products;
	sales;
	sale_items;
	expenses;
	settings;
	constructor() {
		super("pos-db");
		this.version(2).stores({
			products: "id, name, category",
			sales: "id, timestamp",
			sale_items: "id, sale_id",
			settings: "key"
		});
		this.version(3).stores({
			products: "id, name, category, updated_at",
			sales: "id, timestamp, updated_at",
			sale_items: "id, sale_id, updated_at",
			expenses: "id, timestamp, category, updated_at",
			settings: "key"
		}).upgrade(async (tx) => {
			const now = Date.now();
			await tx.table("sales").toCollection().modify((s) => {
				s.updated_at ??= s.timestamp ?? now;
				s.sync_status ??= "local";
				s.customers_count ??= 1;
			});
			for (const name of ["products", "sale_items"]) await tx.table(name).toCollection().modify((r) => {
				r.updated_at ??= now;
				r.sync_status ??= "local";
			});
		});
	}
};
var instance = null;
function getDB() {
	if (typeof window === "undefined") throw new Error("IndexedDB only available in the browser");
	if (!instance) instance = new PosDatabase();
	return instance;
}
var uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
/** Champs de synchronisation d'un enregistrement qu'on vient d'écrire. */
var touch = () => ({
	updated_at: Date.now(),
	sync_status: "local"
});
/** Filtre des enregistrements non supprimés. Toute lecture publique passe par là. */
var alive = (rows) => rows.filter((r) => !r.deleted_at);
async function listProducts() {
	return alive(await getDB().products.toArray()).map((p) => ({
		...p,
		cost: p.cost ?? 0
	})).sort((a, b) => a.name.localeCompare(b.name));
}
async function addProduct(p) {
	const product = {
		...p,
		id: uid(),
		...touch()
	};
	await getDB().products.put(product);
	return product;
}
async function updateProduct(p) {
	await getDB().products.put({
		...p,
		...touch()
	});
}
/**
* Suppression LOGIQUE. Le produit disparaît de `listProducts` mais reste en base :
* une suppression physique ne pourrait pas se propager à un autre appareil, et
* l'historique des ventes garde de toute façon nom, prix et coût figés dans ses lignes.
*/
async function deleteProduct(id) {
	const db = getDB();
	const p = await db.products.get(id);
	if (!p) return;
	await db.products.put({
		...p,
		...touch(),
		deleted_at: Date.now()
	});
}
async function createSale(input) {
	const db = getDB();
	const total = input.lines.reduce((s, l) => s + l.price * l.quantity, 0);
	const sale = {
		id: uid(),
		timestamp: Date.now(),
		total,
		cash_given: input.cash_given,
		change_due: input.cash_given - total,
		day_closed: false,
		customers_count: Math.max(1, input.customers_count ?? 1),
		...touch()
	};
	await db.transaction("rw", db.sales, db.sale_items, db.products, async () => {
		await db.sales.put(sale);
		for (const line of input.lines) {
			await db.sale_items.put({
				id: uid(),
				sale_id: sale.id,
				product_id: line.product_id,
				name: line.name,
				quantity: line.quantity,
				price_at_sale: line.price,
				cost_at_sale: line.cost,
				category_at_sale: line.category,
				...touch()
			});
			if (!line.product_id) continue;
			const p = await db.products.get(line.product_id);
			if (p && Number.isFinite(p.stock)) await db.products.put({
				...p,
				stock: Math.max(0, p.stock - line.quantity),
				...touch()
			});
		}
	});
	return sale;
}
async function listSales(from, to) {
	const db = getDB();
	return alive(await (from !== void 0 && to !== void 0 ? db.sales.where("timestamp").between(from, to, true, false) : db.sales.toCollection()).toArray()).filter((s) => (from ? s.timestamp >= from : true) && (to ? s.timestamp < to : true)).sort((a, b) => b.timestamp - a.timestamp);
}
function startOfToday() {
	const start = /* @__PURE__ */ new Date();
	start.setHours(0, 0, 0, 0);
	return start.getTime();
}
async function listSalesToday() {
	const start = startOfToday();
	return listSales(start, start + 864e5);
}
async function getSaleItems(saleId) {
	return alive(await getDB().sale_items.where("sale_id").equals(saleId).toArray());
}
async function getSaleItemsForSales(saleIds) {
	if (saleIds.length === 0) return [];
	return alive(await getDB().sale_items.where("sale_id").anyOf(saleIds).toArray());
}
/**
* Annule une vente : réintègre les stocks et marque vente + lignes comme supprimées.
* La suppression est LOGIQUE — les enregistrements restent en base pour qu'une
* synchronisation future puisse propager l'annulation à un autre appareil.
*/
async function cancelSale(saleId) {
	const db = getDB();
	await db.transaction("rw", db.sales, db.sale_items, db.products, async () => {
		const sale = await db.sales.get(saleId);
		if (!sale || sale.deleted_at) return;
		if (sale.day_closed) throw new Error("Journée clôturée, annulation impossible.");
		const deleted_at = Date.now();
		const items = await db.sale_items.where("sale_id").equals(saleId).toArray();
		for (const item of items) {
			if (item.deleted_at) continue;
			if (item.product_id) {
				const p = await db.products.get(item.product_id);
				if (p && Number.isFinite(p.stock)) await db.products.put({
					...p,
					stock: p.stock + item.quantity,
					...touch()
				});
			}
			await db.sale_items.put({
				...item,
				...touch(),
				deleted_at
			});
		}
		await db.sales.put({
			...sale,
			...touch(),
			deleted_at
		});
	});
}
async function closeDay() {
	const db = getDB();
	const sales = await listSalesToday();
	await db.transaction("rw", db.sales, async () => {
		for (const s of sales) if (!s.day_closed) await db.sales.put({
			...s,
			day_closed: true,
			...touch()
		});
	});
	return sales.length;
}
async function listExpenses(from, to) {
	const db = getDB();
	return alive(await (from !== void 0 && to !== void 0 ? db.expenses.where("timestamp").between(from, to, true, false) : db.expenses.toCollection()).toArray()).sort((a, b) => b.timestamp - a.timestamp);
}
async function addExpense(e) {
	const expense = {
		...e,
		id: uid(),
		timestamp: e.timestamp ?? Date.now(),
		...touch()
	};
	await getDB().expenses.put(expense);
	return expense;
}
async function deleteExpense(id) {
	const db = getDB();
	const e = await db.expenses.get(id);
	if (!e) return;
	await db.expenses.put({
		...e,
		...touch(),
		deleted_at: Date.now()
	});
}
/**
* Copie BRUTE des quatre stores métier, enregistrements supprimés compris.
*
* Le `alive()` des lectures publiques est délibérément court-circuité ici : une
* sauvegarde qui jetterait les pierres tombales (`deleted_at`) ferait réapparaître,
* à la restauration, des ventes que l'utilisateur avait annulées. Les préférences ne
* sont PAS incluses — elles sont propres à l'appareil (cf. src/lib/settings.ts).
*/
async function exportSnapshot() {
	const db = getDB();
	const [products, sales, sale_items, expenses] = await Promise.all([
		db.products.toArray(),
		db.sales.toArray(),
		db.sale_items.toArray(),
		db.expenses.toArray()
	]);
	return {
		products,
		sales,
		sale_items,
		expenses
	};
}
/**
* REMPLACE intégralement les données métier par celles du snapshot.
*
* Destructif et volontairement non fusionnant : fusionner demanderait une règle de
* résolution de conflit (même identifiant, deux contenus) qui n'a de sens qu'une fois
* la synchronisation cloud en place. Restaurer, c'est revenir à un état connu.
*
* Le tout est dans UNE transaction : une restauration interrompue à mi-chemin laisserait
* une base à moitié vidée, pire que l'état de départ.
*/
async function replaceAllData(snapshot) {
	const db = getDB();
	await db.transaction("rw", db.products, db.sales, db.sale_items, db.expenses, async () => {
		await Promise.all([
			db.products.clear(),
			db.sales.clear(),
			db.sale_items.clear(),
			db.expenses.clear()
		]);
		await Promise.all([
			db.products.bulkPut(snapshot.products),
			db.sales.bulkPut(snapshot.sales),
			db.sale_items.bulkPut(snapshot.sale_items),
			db.expenses.bulkPut(snapshot.expenses)
		]);
	});
}
async function getSetting(key) {
	return (await getDB().settings.get(key))?.value;
}
async function setSetting(key, value) {
	await getDB().settings.put({
		key,
		value
	});
}
//#endregion
export { updateProduct as C, startOfToday as S, listExpenses as _, addProduct as a, replaceAllData as b, closeDay as c, deleteExpense as d, deleteProduct as f, getSetting as g, getSaleItemsForSales as h, addExpense as i, cn as l, getSaleItems as m, CATEGORIES as n, buttonVariants as o, exportSnapshot as p, EXPENSE_CATEGORIES as r, cancelSale as s, Button as t, createSale as u, listProducts as v, setSetting as x, listSales as y };
