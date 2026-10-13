// Catégories produit. Les quatre premières sont fixes ; le `(string & {})` laisse un
// commerce ajouter les siennes (« Chips », « Sucreries »…) — cf. `addCategory`. Garder
// les littéraux dans l'union conserve l'autocomplétion dans l'éditeur.
export type Category = "Boisson" | "Snack" | "Service" | "Autre" | (string & {});

// Source unique de la liste FIXE : le formulaire produit et le dialogue « Article manuel »
// la consomment tous les deux, et `listCategories()` y ajoute les catégories créées par
// le commerce.
export const CATEGORIES: Category[] = ["Boisson", "Snack", "Service", "Autre"];

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

/**
 * Variante d'un produit (vêtements/chaussures : taille, couleur, pointure…). Quand un
 * produit porte `variants`, c'est le stock et le prix de CHAQUE variante qui font foi à
 * la vente — `product.stock`/`product.price` deviennent des références (la somme des
 * variantes, le prix de base). Absent = produit classique, inchangé.
 */
export interface ProductVariant {
  id: string;
  /** Libellé affiché, ex « Noir M », « 39 », « Rouge ». */
  name: string;
  /** Prix de vente de cette variante. Absent → prix de base du produit. */
  price?: number;
  /** Coût de cette variante (marge). Absent → coût du produit. */
  cost?: number;
  /** Stock propre à la variante. Absent → suivi en nombre infinie/non suivi. */
  stock?: number;
  /** Dimensions pour l'affichage du sélecteur (facultatives). */
  size?: string;
  color?: string;
  /** Pointure (chaussures), ex « 39 ». */
  pointure?: string;
  /** Période de location (hour/day/week/month/year). */
  period?: "hour" | "day" | "week" | "month" | "year";
}

export interface Product extends SyncFields {
  id: string;
  name: string;
  cost: number; // prix d'acquisition FCFA (0 = inconnu)
  price: number; // prix de revente FCFA
  stock: number; // Number.POSITIVE_INFINITY when unlimited
  category: Category;
  /** Variantes du produit. Absent = produit classique (stock/prix globaux). */
  variants?: ProductVariant[];
  /** Type métier : 'product' = bien physique (défaut), 'service' = prestation. */
  type?: "product" | "service";
  // ── V2 : champs pré-configurés (V10) ──────────────────────────────────
  /** Numéro de série / IMEI (électronique, SAV). Absent = pas de suivi. */
  serialNumber?: string;
  /**
   * Unité de vente. Absent = pièce par défaut.
   *
   * V23 fusionne les trois champs qui se partageaient cette information : `unitType`
   * ("weight" = vendu au poids) + `weightUnit` (toujours "kg") + `unit` (quincaillerie).
   * Une seule valeur les remplace désormais — le poids n'est plus une orthographe
   * séparée du conditionnement mais UNE unité parmi les autres, saisissable partout.
   */
  unit?: "piece" | "kg" | "liter" | "meter";
  /**
   * Photo du produit ou service, en dataURL (webp réduit). Champ optionnel sans index :
   * aucun upgrade(), les fiches existantes le lisent `undefined`. Reste local — la
   * synchronisation n'envoie que des agrégats, jamais le catalogue.
   */
  photo?: string;
  /**
   * Seuil « stock faible » propre au produit. Absent = seuil global de 5 (cf.
   * src/lib/alerts.ts). Sans index : aucun upgrade nécessaire, les fiches existantes
   * le lisent `undefined`.
   */
  min_stock?: number;
}
