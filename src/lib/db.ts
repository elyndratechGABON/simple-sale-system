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

// Catégories produit. Les quatre premières sont fixes ; le `(string & {})` laisse un
// commerce ajouter les siennes (« Chips », « Sucreries »…) — cf. `addCategory`. Garder
// les littéraux dans l'union conserve l'autocomplétion dans l'éditeur.
export type Category = "Boisson" | "Snack" | "Service" | "Autre" | (string & {});

// Source unique de la liste FIXE : le formulaire produit et le dialogue « Article manuel »
// la consomment tous les deux, et `listCategories()` y ajoute les catégories créées par
// le commerce.
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

/**
 * "open"  : addition de table en cours. L'argent n'est PAS encaissé.
 * "paid"  : vente réglée. C'est le seul état qui compte comme chiffre d'affaires.
 *
 * Absent sur toutes les ventes antérieures aux tables : elles sont lues comme "paid",
 * ce qui est exact — elles ont toutes été encaissées immédiatement.
 */
export type SaleStatus = "open" | "paid";

export interface Sale extends SyncFields {
  id: string;
  // Moment de l'ENCAISSEMENT, et c'est lui qui date la vente dans les rapports. Une table
  // ouverte porte ici l'heure de son ouverture, réécrite au paiement : une table ouverte
  // la veille et réglée aujourd'hui compte sur aujourd'hui, là où l'argent est entré.
  timestamp: number;
  total: number;
  cash_given: number;
  change_due: number;
  day_closed: boolean;
  // Nombre de personnes servies par cette vente. Défaut 1. Volontairement un compteur
  // et non une fiche client : le KPI demandé est « nombre de clients », pas un CRM.
  // Absent sur les ventes antérieures à ce suivi → compté comme 1 à l'agrégation.
  customers_count?: number;
  /** Libellé de la table servie. Absent = vente directe au comptoir. */
  table?: string;
  /** Cf. SaleStatus. Absent = "paid". */
  status?: SaleStatus;
  /** Ouverture de la table. Absent sur une vente directe. */
  opened_at?: number;
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
  // Horodatage de la tournée, pour regrouper les lignes d'une addition à l'écran. Absent
  // sur une vente directe et sur les ventes antérieures aux tables → une seule tournée.
  ordered_at?: number;
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

    // Version 4 — additions ouvertes par table. SEUL changement : l'index `status` sur
    // `sales`, qui rend `listOpenTables()` possible en une requête indexée.
    //
    // AUCUN `upgrade()`, et c'est délibéré. Dexie n'indexe pas les enregistrements dont
    // la clé est absente : les ventes déjà en base, qui n'ont pas de `status`, restent
    // donc hors de `where("status").equals("open")` — exactement ce qu'il faut, elles ont
    // toutes été encaissées. Réécrire des milliers de ventes réelles pour y poser un
    // champ que la lecture sait déjà déduire (`status !== "open"`) serait un risque pris
    // pour rien. Même logique défensive que les `?? 0` / `?? 1` de ce fichier.
    this.version(4).stores({
      products: "id, name, category, updated_at",
      sales: "id, timestamp, status, updated_at",
      sale_items: "id, sale_id, updated_at",
      expenses: "id, timestamp, category, updated_at",
      settings: "key",
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

/**
 * Filtre des ventes RÉELLEMENT ENCAISSÉES. Jumeau d'`alive()`, et aussi obligatoire.
 *
 * Une addition de table ouverte est une vente en base dont l'argent n'est pas dans la
 * caisse. La laisser passer la ferait compter en chiffre d'affaires : revenus, marge,
 * panier moyen et exports gonfleraient d'un montant que personne n'a payé — sans erreur
 * visible nulle part. `listSales()` est l'entonnoir unique de l'historique ET des
 * rapports (`usePeriodData`, `getProfitToday`) : le filtre y est posé une fois, pour
 * tous les lecteurs présents et futurs.
 *
 * Les additions en cours ne se lisent que par `listOpenTables()`, dont le nom dit ce
 * qu'il rend.
 */
const paid = (rows: Sale[]): Sale[] => rows.filter((s) => s.status !== "open");

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
    // Explicite bien qu'omis : une vente directe est encaissée au moment où on la crée.
    status: "paid",
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

/** Ventes ENCAISSÉES uniquement — cf. `paid()`. Les tables ouvertes n'en font pas partie. */
export async function listSales(from?: number, to?: number): Promise<Sale[]> {
  const db = getDB();
  const collection =
    from !== undefined && to !== undefined
      ? db.sales.where("timestamp").between(from, to, true, false)
      : db.sales.toCollection();
  const all = await collection.toArray();
  return paid(alive(all))
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

// ---------- Tables (additions ouvertes) ----------
//
// Une addition de table est une `Sale` de statut "open" : même enregistrement, mêmes
// lignes, même annulation. Rien de nouveau en base, donc rien de nouveau à sauvegarder,
// à restaurer ou à synchroniser plus tard — et `cancelSale` fonctionne dessus telle
// quelle. Le prix de ce choix est le filtre `paid()`, qui doit rester posé sur toute
// lecture de ventes.
//
// Le stock part à la COMMANDE et non au paiement : la bouteille a quitté le frigo au
// moment de la tournée. C'est ce qui rend l'avertissement « stock insuffisant » utile
// pendant le service, et non deux heures trop tard.

/** Additions en cours, de la plus ancienne à la plus récente — l'ordre du service. */
export async function listOpenTables(): Promise<Sale[]> {
  const rows = await getDB().sales.where("status").equals("open").toArray();
  return alive(rows).sort((a, b) => (a.opened_at ?? a.timestamp) - (b.opened_at ?? b.timestamp));
}

export async function openTable(label: string): Promise<Sale> {
  const now = Date.now();
  const sale: Sale = {
    id: uid(),
    // Provisoire : réécrit par `payTable`. Tant que la table est ouverte, cette date ne
    // sert qu'à trier — aucune lecture de chiffre d'affaires ne la voit, `paid()` filtre.
    timestamp: now,
    opened_at: now,
    total: 0,
    cash_given: 0,
    change_due: 0,
    day_closed: false,
    // Une table compte pour UN client, sans jamais demander combien de personnes s'y
    // assoient : le service n'a pas à compter des couverts pour encaisser. Le KPI
    // « clients » ne se renseigne donc plus qu'au comptoir.
    customers_count: 1,
    table: label,
    status: "open",
    ...touch(),
  };
  await getDB().sales.put(sale);
  return sale;
}

/**
 * Libère une table ouverte sur laquelle rien n'a encore été servi.
 *
 * Une table s'ouvre d'un tap et se libère d'un appui long : c'est le geste inverse, pas
 * une annulation, et il sert au cas le plus banal du service — la table ouverte par
 * erreur, ou les clients partis avant de commander.
 *
 * La garde sur les lignes est le tout : dès qu'une tournée est passée, du stock est sorti
 * et de l'argent est dû. Ce cas-là reste « Annuler la table », avec son code PIN et sa
 * restauration de stock (`cancelSale`) — un appui long ne doit jamais pouvoir effacer une
 * addition servie.
 */
export async function closeTable(saleId: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.sales, db.sale_items, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) return;
    if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");
    const items = alive(await db.sale_items.where("sale_id").equals(saleId).toArray());
    if (items.length > 0) {
      throw new Error("Des articles ont déjà été servis : utilisez « Annuler la table ».");
    }
    await db.sales.put({ ...sale, ...touch(), deleted_at: Date.now() });
  });
}

/**
 * Ajoute une tournée à une addition ouverte.
 *
 * Une seule transaction pour les lignes, le stock et le total : une tournée enregistrée
 * sans son décrément de stock, ou un total qui ne suit pas ses lignes, se verrait à
 * l'addition et il serait trop tard pour savoir quoi corriger.
 */
export async function addRound(saleId: string, lines: CartLine[]): Promise<Sale> {
  const db = getDB();
  const ordered_at = Date.now();
  return db.transaction("rw", db.sales, db.sale_items, db.products, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) throw new Error("Table introuvable.");
    if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");

    for (const line of lines) {
      await db.sale_items.put({
        id: uid(),
        sale_id: sale.id,
        product_id: line.product_id,
        name: line.name,
        quantity: line.quantity,
        price_at_sale: line.price,
        cost_at_sale: line.cost,
        category_at_sale: line.category,
        ordered_at,
        ...touch(),
      });
      if (!line.product_id) continue; // ligne libre : rien à décrémenter
      const p = await db.products.get(line.product_id);
      if (p && Number.isFinite(p.stock)) {
        await db.products.put({ ...p, stock: Math.max(0, p.stock - line.quantity), ...touch() });
      }
    }

    // Le total se RECALCULE depuis les lignes vivantes plutôt que de s'incrémenter : une
    // addition dont le total dérive de ses lignes ne peut pas mentir, même si une tournée
    // a été écrite deux fois.
    const items = alive(await db.sale_items.where("sale_id").equals(sale.id).toArray());
    const total = items.reduce((s, i) => s + i.price_at_sale * i.quantity, 0);
    const updated: Sale = { ...sale, total, ...touch() };
    await db.sales.put(updated);
    return updated;
  });
}

/** Encaisse une addition : elle devient une vente ordinaire, datée de cet instant. */
export async function payTable(saleId: string, cashGiven: number): Promise<Sale> {
  const db = getDB();
  return db.transaction("rw", db.sales, db.sale_items, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) throw new Error("Table introuvable.");
    if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");

    const items = alive(await db.sale_items.where("sale_id").equals(sale.id).toArray());
    if (items.length === 0) throw new Error("Addition vide, rien à encaisser.");
    const total = items.reduce((s, i) => s + i.price_at_sale * i.quantity, 0);
    if (cashGiven < total) throw new Error("Montant insuffisant.");

    const now = Date.now();
    const settled: Sale = {
      ...sale,
      status: "paid",
      // La vente est datée de l'ENCAISSEMENT, pas de l'ouverture : c'est aujourd'hui que
      // l'argent est entré, et c'est aujourd'hui que les rapports doivent le voir.
      timestamp: now,
      total,
      cash_given: cashGiven,
      change_due: cashGiven - total,
      ...touch(),
    };
    await db.sales.put(settled);
    return settled;
  });
}

/**
 * Encaisse UNE TOURNÉE d'une addition ouverte, sans clore la table.
 *
 * La tournée est identifiée par son `ordered_at` — l'heure de commande que `addRound`
 * pose sur toutes ses lignes. L'encaissement DÉPLACE ces lignes vers une vente `paid`
 * à part entière plutôt que de les marquer : les rapports, l'historique et les exports
 * ne lisent le chiffre d'affaires qu'au travers de `listSales()` (filtre `paid()`), et
 * une table reste `"open"` tant qu'elle peut encore recevoir une tournée. Déplacer les
 * lignes vers une vente réglée les fait donc compter à l'instant où l'argent entre,
 * sans percer l'invariant « une addition ouverte n'est pas du CA » dans les rapports.
 *
 * Le stock, lui, est déjà sorti à la COMMANDE (`addRound`) : aucun décrément ici.
 * L'annulation de la vente sortie (`cancelSale`) restaure — comme pour n'importe quelle
 * vente. `closeTable` reste le geste inverse d'`openTable`, il n'est pas affecté.
 */
export async function payRound(
  saleId: string,
  orderedAt: number,
  cashGiven: number,
): Promise<Sale> {
  const db = getDB();
  return db.transaction("rw", db.sales, db.sale_items, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) throw new Error("Table introuvable.");
    if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");

    const roundItems = alive(await db.sale_items.where("sale_id").equals(saleId).toArray()).filter(
      (i) => i.ordered_at === orderedAt,
    );
    if (roundItems.length === 0) throw new Error("Tournée introuvable.");

    const roundTotal = roundItems.reduce((s, i) => s + i.price_at_sale * i.quantity, 0);
    if (cashGiven < roundTotal) throw new Error("Montant insuffisant.");

    const now = Date.now();
    const settled: Sale = {
      id: uid(),
      timestamp: now,
      total: roundTotal,
      cash_given: cashGiven,
      change_due: cashGiven - roundTotal,
      day_closed: false,
      // Chaque encaissement est une transaction comme une vente au comptoir : il compte
      // pour un client. Le compteur reste volontairement simple, cf. `openTable`.
      customers_count: 1,
      table: sale.table,
      status: "paid",
      ...touch(),
    };
    await db.sales.put(settled);

    for (const item of roundItems) {
      await db.sale_items.put({ ...item, sale_id: settled.id, ...touch() });
    }

    // Le total de la table se recalcule sur ce qui n'a pas encore été encaissé : une
    // tournée payée sort de l'addition, la suite du service repart de ce qui reste dû.
    const remaining = alive(await db.sale_items.where("sale_id").equals(saleId).toArray());
    await db.sales.put({
      ...sale,
      total: remaining.reduce((s, i) => s + i.price_at_sale * i.quantity, 0),
      ...touch(),
    });

    return settled;
  });
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

// ---------- Catégories ----------
// Les catégories fixes vivent dans `CATEGORIES` ; les catégories créées par le commerce
// s'ajoutent à côté, dans les préférences, et la liste affichée est toujours la
// concaténation des deux. Une catégorie qui n'a plus aucun produit n'est jamais nettoyée
// d'office : elle est un choix du commerce, pas un artefact à récolter.
const CUSTOM_CATEGORIES_KEY = "custom_categories";

/** Catégories fixes + catégories personnalisées, dans l'ordre d'affichage. */
export async function listCategories(): Promise<Category[]> {
  const custom = await getSetting<string[]>(CUSTOM_CATEGORIES_KEY);
  return [...CATEGORIES, ...(custom ?? [])];
}

/** Crée une catégorie personnalisée si elle n'existe pas déjà. Renvoie son nom exact. */
export async function addCategory(label: string): Promise<Category> {
  const name = label.trim();
  if (!name) throw new Error("Nom de catégorie requis.");
  const current = await listCategories();
  if (current.includes(name)) return name;
  const custom = (await getSetting<string[]>(CUSTOM_CATEGORIES_KEY)) ?? [];
  await setSetting(CUSTOM_CATEGORIES_KEY, [...custom, name]);
  return name;
}
