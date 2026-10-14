import { getDB } from "./internal";
import type {
  Charge,
  Client,
  MonthlyOverview,
  ProductExpense,
  Subscription,
} from "./types/records";
import type { Sale, SaleItem } from "./types/sales";
import type { Product } from "./types/sync";

// ---------- Sauvegarde / restauration ----------
// Les champs optionnels sont ceux ajoutés APRÈS la première version : une sauvegarde
// enregistrée avant leur arrivée ne les contient pas, et doit se restaurer quand même.
export interface DatabaseSnapshot {
  products: Product[];
  sales: Sale[];
  sale_items: SaleItem[];
  subscriptions: Subscription[];
  clients?: Client[];
  product_expenses?: ProductExpense[];
  monthly_overviews?: MonthlyOverview[];
  charges?: Charge[];
}

/**
 * Copie BRUTE des trois stores métier, enregistrements supprimés compris.
 *
 * Le `alive()` des lectures publiques est délibérément court-circuité ici : une
 * sauvegarde qui jetterait les pierres tombales (`deleted_at`) ferait réapparaître,
 * à la restauration, des ventes que l'utilisateur avait annulées. Les préférences ne
 * sont PAS incluses — elles sont propres à l'appareil (cf. src/lib/settings.ts).
 */
export async function exportSnapshot(): Promise<DatabaseSnapshot> {
  const db = getDB();
  const [
    products,
    sales,
    sale_items,
    subscriptions,
    clients,
    product_expenses,
    monthly_overviews,
    charges,
  ] = await Promise.all([
    db.products.toArray(),
    db.sales.toArray(),
    db.sale_items.toArray(),
    db.subscriptions.toArray(),
    db.clients.toArray(),
    db.product_expenses.toArray(),
    db.monthly_overviews.toArray(),
    db.charges.toArray(),
  ]);
  return {
    products,
    sales,
    sale_items,
    subscriptions,
    clients,
    product_expenses,
    monthly_overviews,
    charges,
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
export async function replaceAllData(snapshot: DatabaseSnapshot): Promise<void> {
  const db = getDB();
  await db.transaction(
    "rw",
    [
      db.products,
      db.sales,
      db.sale_items,
      db.subscriptions,
      db.clients,
      db.product_expenses,
      db.monthly_overviews,
      db.charges,
    ],
    async () => {
      await Promise.all([
        db.products.clear(),
        db.sales.clear(),
        db.sale_items.clear(),
        db.subscriptions.clear(),
        db.clients.clear(),
        db.product_expenses.clear(),
        db.monthly_overviews.clear(),
        db.charges.clear(),
      ]);
      await Promise.all([
        db.products.bulkPut(snapshot.products),
        db.sales.bulkPut(snapshot.sales),
        db.sale_items.bulkPut(snapshot.sale_items),
        db.subscriptions.bulkPut(snapshot.subscriptions ?? []),
        db.clients.bulkPut(snapshot.clients ?? []),
        db.product_expenses.bulkPut(snapshot.product_expenses ?? []),
        db.monthly_overviews.bulkPut(snapshot.monthly_overviews ?? []),
        db.charges.bulkPut(snapshot.charges ?? []),
      ]);
    },
  );
}

/**
 * Purge TOTALE, toutes stores compris (boutique, ventes, produits, réglages, profil).
 *
 * C'est l'équivalent local de « Supprimer la boutique » : après cet appel l'appareil
 * repart comme au premier lancement — `ensureShopProfile` recréera une fiche avec un
 * NOUVEAU `deviceId` au prochain montage. Tous les stores dans une transaction : un
 * effacement interrompu laisserait une base à moitié purgée.
 */
export async function purgeAllData(): Promise<void> {
  const db = getDB();
  await db.transaction(
    "rw",
    [
      db.products,
      db.sales,
      db.sale_items,
      db.settings,
      db.subscriptions,
      db.shop_profiles,
      db.clients,
      db.product_expenses,
      db.monthly_overviews,
      db.charges,
    ],
    async () => {
      await Promise.all([
        db.products.clear(),
        db.sales.clear(),
        db.sale_items.clear(),
        db.settings.clear(),
        db.subscriptions.clear(),
        db.shop_profiles.clear(),
        db.clients.clear(),
        db.product_expenses.clear(),
        db.monthly_overviews.clear(),
        db.charges.clear(),
      ]);
    },
  );
}
