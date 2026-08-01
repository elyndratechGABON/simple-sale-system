// Couche de persistance unique de l'application — Dexie (IndexedDB), 100 % navigateur.
//
// Invariants :
//  - C'est le SEUL module qui touche IndexedDB. Aucune route n'ouvre la base directement.
//  - Toute écriture qui touche plusieurs stores passe par une transaction atomique
//    (produit + vente + lignes) : une vente enregistrée sans ses lignes, ou dont le
//    stock n'a pas été décrémenté, corrompt silencieusement tous les rapports.
//  - Les montants sont des entiers FCFA.
//  - Les prix et coûts sont FIGÉS dans la ligne de vente (`price_at_sale`, `cost_at_sale`,
//    `category_at_sale`) : modifier une fiche produit ne doit jamais réécrire l'historique.
//  - Les suppressions sont LOGIQUES (`deleted_at`), jamais physiques — cf. « Champs de
//    synchronisation » plus bas. Toute lecture doit donc filtrer les enregistrements
//    supprimés ; c'est le rôle de `alive()`.
import Dexie, { type Table } from "dexie";

export type Category = "Boisson" | "Snack" | "Service" | "Autre";

// Source unique de la liste : le formulaire produit et le dialogue « Article manuel »
// la consomment tous les deux.
export const CATEGORIES: Category[] = ["Boisson", "Snack", "Service", "Autre"];

export type ExpenseCategory = "Achat" | "Transport" | "Salaire" | "Loyer" | "Autre";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Achat",
  "Transport",
  "Salaire",
  "Loyer",
  "Autre",
];

// ---------- Champs de synchronisation ----------
// Présents sur TOUT enregistrement métier. Aucun code réseau ne les lit aujourd'hui :
// ils existent pour qu'une synchronisation cloud future se branche sans toucher à la
// logique métier ni migrer une base déjà remplie de ventes réelles.
//
//  - `updated_at` : horodatage de dernière écriture, indexé. Un pull incrémental se
//    résume alors à `where("updated_at").above(lastSync)`.
//  - `deleted_at` : suppression LOGIQUE. Une suppression physique ne peut pas se
//    propager à un autre appareil — il n'y a plus rien à propager. Le prix à payer :
//    toute lecture filtre, d'où `alive()`.
//  - `sync_status` : "local" tant que l'enregistrement n'a pas été poussé.
export type SyncStatus = "local" | "synced";

export interface SyncFields {
  updated_at: number;
  deleted_at?: number;
  sync_status: SyncStatus;
}

export interface Product extends SyncFields {
  id: string;
  name: string;
  cost: number; // prix d'acquisition FCFA (0 = inconnu)
  price: number; // prix de revente FCFA
  stock: number; // Number.POSITIVE_INFINITY when unlimited
  category: Category;
}

export interface Sale extends SyncFields {
  id: string;
  timestamp: number;
  total: number;
  cash_given: number;
  change_due: number;
  day_closed: boolean;
  // Nombre de personnes servies par cette vente. Défaut 1. Volontairement un compteur
  // et non une fiche client : le KPI demandé est « nombre de clients », pas un CRM.
  // Absent sur les ventes antérieures à ce suivi → compté comme 1 à l'agrégation.
  customers_count?: number;
}

export interface SaleItem extends SyncFields {
  id: string;
  sale_id: string;
  product_id?: string; // absent = ligne libre saisie à la main, sans produit au catalogue
  name: string;
  quantity: number;
  price_at_sale: number;
  // Prix d'acquisition figé à la vente : modifier le coût d'un produit ne doit pas
  // réécrire le bénéfice des ventes déjà enregistrées.
  cost_at_sale: number;
  // Catégorie figée elle aussi : la répartition des revenus par catégorie ne peut pas
  // se calculer par jointure, un produit supprimé ou une ligne libre n'en aurait plus.
  // Absente sur les ventes antérieures à ce suivi → « Autre » côté agrégation.
  category_at_sale?: Category;
}

// Sortie d'argent qui n'est pas un achat de marchandise déjà compté dans `cost_at_sale`.
// Le bénéfice BRUT (revenus − coûts d'acquisition) vit dans les lignes de vente ; les
// dépenses s'en retranchent pour donner le bénéfice NET.
export interface Expense extends SyncFields {
  id: string;
  timestamp: number;
  label: string;
  amount: number; // FCFA, entier positif
  category: ExpenseCategory;
}

export interface Setting {
  key: string;
  value: unknown;
}

class PosDatabase extends Dexie {
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  sale_items!: Table<SaleItem, string>;
  expenses!: Table<Expense, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super("pos-db");
    // Version 2 — deux comportements Dexie non évidents, tous deux VÉRIFIÉS sur une base
    // réellement créée par l'ancien code `idb` (4 produits / 7 ventes / 8 lignes intacts) :
    //
    //  1. Dexie stocke `version × 10` dans IndexedDB. `version(2)` ci-dessous donne une
    //     base IndexedDB en version 20. Ne pas s'en alarmer et ne pas « corriger ».
    //  2. Les index de l'ancienne base s'appelaient `by_timestamp` et `by_sale`. Dexie ne
    //     les renomme pas et n'en crée pas de doublons : il résout les index par keyPath,
    //     pas par nom. `where("timestamp")` et `where("sale_id")` fonctionnent donc
    //     directement sur les index hérités. Ne pas tenter de les renommer à la main.
    //
    // Une migration ne recrée jamais les enregistrements : les ventes déjà en base
    // survivent. Toute évolution future du schéma ajoute une `version(n+1)`, elle ne
    // modifie pas celle-ci.
    this.version(2).stores({
      products: "id, name, category",
      sales: "id, timestamp",
      sale_items: "id, sale_id",
      settings: "key",
    });

    // Version 3 — champs de synchronisation, store `expenses`, compteur de clients.
    // Les trois tiennent dans UNE migration à dessein : chaque `version(n)` supplémentaire
    // est une réouverture de la base sur le terrain, donc une occasion de plus de la
    // corrompre chez un utilisateur qui ferme l'onglet au mauvais moment.
    //
    // `updated_at` est indexé sur les quatre stores métier : c'est ce qui rendra un pull
    // incrémental possible (`where("updated_at").above(lastSync)`) sans re-migrer.
    // `deleted_at` ne l'est PAS : un index sur un champ presque toujours absent ne sert
    // qu'à filtrer ce qui est déjà rare, le filtre en mémoire de `alive()` suffit.
    this.version(3)
      .stores({
        products: "id, name, category, updated_at",
        sales: "id, timestamp, updated_at",
        sale_items: "id, sale_id, updated_at",
        expenses: "id, timestamp, category, updated_at",
        settings: "key",
      })
      .upgrade(async (tx) => {
        const now = Date.now();
        // Les ventes existantes datent leur `updated_at` de leur propre horodatage, pas
        // de l'instant de la migration : sinon une première synchronisation croirait que
        // tout l'historique vient d'être modifié et le repousserait en entier.
        await tx
          .table("sales")
          .toCollection()
          .modify((s) => {
            s.updated_at ??= s.timestamp ?? now;
            s.sync_status ??= "local";
            s.customers_count ??= 1;
          });
        // Les lignes de vente n'ont pas d'horodatage propre ; celui de leur vente n'est
        // pas lisible ici sans une jointure par ligne. `now` est acceptable : elles ne
        // sont jamais modifiées après création, elles seront poussées une seule fois.
        for (const name of ["products", "sale_items"]) {
          await tx
            .table(name)
            .toCollection()
            .modify((r) => {
              r.updated_at ??= now;
              r.sync_status ??= "local";
            });
        }
      });
  }
}

let instance: PosDatabase | null = null;

function getDB(): PosDatabase {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB only available in the browser");
  }
  if (!instance) instance = new PosDatabase();
  return instance;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/** Champs de synchronisation d'un enregistrement qu'on vient d'écrire. */
const touch = (): SyncFields => ({ updated_at: Date.now(), sync_status: "local" });

/** Filtre des enregistrements non supprimés. Toute lecture publique passe par là. */
const alive = <T extends SyncFields>(rows: T[]): T[] => rows.filter((r) => !r.deleted_at);

// ---------- Products ----------
export async function listProducts(): Promise<Product[]> {
  const all = await getDB().products.toArray();
  // `cost` est absent des produits créés avant le suivi du prix d'acquisition. Un store
  // IndexedDB ne contraint pas la forme des records : ajouter un champ ne demande aucune
  // migration, la normalisation se fait ici. Ne pas « simplifier » le `?? 0`.
  return alive(all)
    .map((p) => ({ ...p, cost: p.cost ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addProduct(p: Omit<Product, "id" | keyof SyncFields>): Promise<Product> {
  const product: Product = { ...p, id: uid(), ...touch() };
  await getDB().products.put(product);
  return product;
}

export async function updateProduct(p: Product): Promise<void> {
  await getDB().products.put({ ...p, ...touch() });
}

/**
 * Suppression LOGIQUE. Le produit disparaît de `listProducts` mais reste en base :
 * une suppression physique ne pourrait pas se propager à un autre appareil, et
 * l'historique des ventes garde de toute façon nom, prix et coût figés dans ses lignes.
 */
export async function deleteProduct(id: string): Promise<void> {
  const db = getDB();
  const p = await db.products.get(id);
  if (!p) return;
  await db.products.put({ ...p, ...touch(), deleted_at: Date.now() });
}

// ---------- Sales ----------
export interface CartLine {
  product_id?: string; // absent = ligne libre, aucun stock à décrémenter
  name: string;
  price: number;
  cost: number;
  category: Category;
  quantity: number;
}

export async function createSale(input: {
  lines: CartLine[];
  cash_given: number;
  customers_count?: number;
}): Promise<Sale> {
  const db = getDB();
  const total = input.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const sale: Sale = {
    id: uid(),
    timestamp: Date.now(),
    total,
    cash_given: input.cash_given,
    change_due: input.cash_given - total,
    day_closed: false,
    customers_count: Math.max(1, input.customers_count ?? 1),
    ...touch(),
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
        ...touch(),
      });
      if (!line.product_id) continue; // ligne libre : rien à décrémenter
      const p = await db.products.get(line.product_id);
      if (p && Number.isFinite(p.stock)) {
        await db.products.put({
          ...p,
          stock: Math.max(0, p.stock - line.quantity),
          ...touch(),
        });
      }
    }
  });
  return sale;
}

export async function listSales(from?: number, to?: number): Promise<Sale[]> {
  const db = getDB();
  const collection =
    from !== undefined && to !== undefined
      ? db.sales.where("timestamp").between(from, to, true, false)
      : db.sales.toCollection();
  const all = await collection.toArray();
  return alive(all)
    .filter((s) => (from ? s.timestamp >= from : true) && (to ? s.timestamp < to : true))
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function startOfToday(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

export async function listSalesToday(): Promise<Sale[]> {
  const start = startOfToday();
  return listSales(start, start + 86400000);
}

export async function getSaleItems(saleId: string): Promise<SaleItem[]> {
  return alive(await getDB().sale_items.where("sale_id").equals(saleId).toArray());
}

// Une seule requête indexée pour un lot de ventes — évite le N+1 des agrégations.
export async function getSaleItemsForSales(saleIds: string[]): Promise<SaleItem[]> {
  if (saleIds.length === 0) return [];
  return alive(await getDB().sale_items.where("sale_id").anyOf(saleIds).toArray());
}

export async function getProfitToday(): Promise<number> {
  const sales = await listSalesToday();
  const items = await getSaleItemsForSales(sales.map((s) => s.id));
  // cost_at_sale absent sur les ventes antérieures au suivi du prix d'acquisition :
  // leur bénéfice vaut alors leur chiffre d'affaires.
  return items.reduce(
    (sum, it) => sum + (it.price_at_sale - (it.cost_at_sale ?? 0)) * it.quantity,
    0,
  );
}

/**
 * Annule une vente : réintègre les stocks et marque vente + lignes comme supprimées.
 * La suppression est LOGIQUE — les enregistrements restent en base pour qu'une
 * synchronisation future puisse propager l'annulation à un autre appareil.
 */
export async function cancelSale(saleId: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.sales, db.sale_items, db.products, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) return;
    if (sale.day_closed) {
      throw new Error("Journée clôturée, annulation impossible.");
    }
    const deleted_at = Date.now();
    const items = await db.sale_items.where("sale_id").equals(saleId).toArray();
    for (const item of items) {
      if (item.deleted_at) continue;
      if (item.product_id) {
        const p = await db.products.get(item.product_id);
        if (p && Number.isFinite(p.stock)) {
          await db.products.put({ ...p, stock: p.stock + item.quantity, ...touch() });
        }
      }
      await db.sale_items.put({ ...item, ...touch(), deleted_at });
    }
    await db.sales.put({ ...sale, ...touch(), deleted_at });
  });
}

export async function closeDay(): Promise<number> {
  const db = getDB();
  const sales = await listSalesToday();
  await db.transaction("rw", db.sales, async () => {
    for (const s of sales) {
      if (!s.day_closed) await db.sales.put({ ...s, day_closed: true, ...touch() });
    }
  });
  return sales.length;
}

// ---------- Expenses ----------
export async function listExpenses(from?: number, to?: number): Promise<Expense[]> {
  const db = getDB();
  const collection =
    from !== undefined && to !== undefined
      ? db.expenses.where("timestamp").between(from, to, true, false)
      : db.expenses.toCollection();
  return alive(await collection.toArray()).sort((a, b) => b.timestamp - a.timestamp);
}

export async function addExpense(
  e: Omit<Expense, "id" | keyof SyncFields> & { timestamp?: number },
): Promise<Expense> {
  const expense: Expense = {
    ...e,
    id: uid(),
    timestamp: e.timestamp ?? Date.now(),
    ...touch(),
  };
  await getDB().expenses.put(expense);
  return expense;
}

export async function updateExpense(e: Expense): Promise<void> {
  await getDB().expenses.put({ ...e, ...touch() });
}

export async function deleteExpense(id: string): Promise<void> {
  const db = getDB();
  const e = await db.expenses.get(id);
  if (!e) return;
  await db.expenses.put({ ...e, ...touch(), deleted_at: Date.now() });
}

// ---------- Sauvegarde / restauration ----------
export interface DatabaseSnapshot {
  products: Product[];
  sales: Sale[];
  sale_items: SaleItem[];
  expenses: Expense[];
}

/**
 * Copie BRUTE des quatre stores métier, enregistrements supprimés compris.
 *
 * Le `alive()` des lectures publiques est délibérément court-circuité ici : une
 * sauvegarde qui jetterait les pierres tombales (`deleted_at`) ferait réapparaître,
 * à la restauration, des ventes que l'utilisateur avait annulées. Les préférences ne
 * sont PAS incluses — elles sont propres à l'appareil (cf. src/lib/settings.ts).
 */
export async function exportSnapshot(): Promise<DatabaseSnapshot> {
  const db = getDB();
  const [products, sales, sale_items, expenses] = await Promise.all([
    db.products.toArray(),
    db.sales.toArray(),
    db.sale_items.toArray(),
    db.expenses.toArray(),
  ]);
  return { products, sales, sale_items, expenses };
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
export async function replaceAllData(snapshot: DatabaseSnapshot): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.products, db.sales, db.sale_items, db.expenses, async () => {
    await Promise.all([
      db.products.clear(),
      db.sales.clear(),
      db.sale_items.clear(),
      db.expenses.clear(),
    ]);
    await Promise.all([
      db.products.bulkPut(snapshot.products),
      db.sales.bulkPut(snapshot.sales),
      db.sale_items.bulkPut(snapshot.sale_items),
      db.expenses.bulkPut(snapshot.expenses),
    ]);
  });
}

// ---------- Settings ----------
// Stockage clé/valeur des préférences durables. Sert au handle de dossier
// (`FileSystemDirectoryHandle`, structured-cloneable) utilisé par src/lib/files.ts.
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await getDB().settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDB().settings.put({ key, value });
}
