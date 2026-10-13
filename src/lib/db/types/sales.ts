import type { Category, SyncFields } from "./sync";

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
  /** Moment où la commande a été servie (restaurant). Absent = pas encore servi. */
  served_at?: number;
  /**
   * Cycle de service (restaurant) : la commande passe de la prise en cuisine au service.
   * `preparing_at` : passée « en préparation ». `ready_at` : « prête » à servir.
   * Absents = commande encore « à préparer ». `served_at` reste le dernier cran.
   */
  preparing_at?: number;
  ready_at?: number;
  /**
   * Tournées déjà encaissées d'une addition encore ouverte (« Encaisser cette tournée »).
   * Absent = aucune : rien n'a été payé, tout reste dû. Posé dans `payRound`, il reste
   * sur la vente si la table est ensuite réglée entièrement (`payTable`), sans servir.
   */
  rounds_paid?: number;
  /** Nom du client (services : coiffeur, salon, etc.). Absent sur les ventes classiques. */
  client_name?: string;
  /** Référence vers le registre clients. Absent si le client n'est pas enregistré. */
  client_id?: string;
  /**
   * Moyen de paiement. Absent sur les ventes antérieures à ce suivi → lu comme
   * « espèces », qui était alors le seul mode possible.
   */
  payment_method?: PaymentMethod;
  /** Réduction accordée en FCFA, déjà déduite de `total`. Absente = aucune remise. */
  discount?: number;
  /** Nom du vendeur (rôle employé) qui a encaissé — pour le suivi d'activité.
   *  Absent sur les ventes antérieures au suivi → « — ». */
  seller_name?: string;
  /** Identifiant d'appareil de la caisse qui a encaissé — relie la vente à son écran. */
  seller_device_id?: string;
}

/** Moyens de paiement acceptés au comptoir. */
export type PaymentMethod = "cash" | "card" | "mobile_money";

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
  /** Numéro de série de l'article (électronique). Absent si non applicable. */
  serial_number?: string;
  /** Libellé de la variante vendue (ex « Noir M »), figé comme le prix. Absent = produit simple. */
  variant?: string;
  /** Identifiant de variante vendue — référence le stock à restaurer à l'annulation. */
  variant_id?: string;
}

export interface CartLine {
  product_id?: string; // absent = ligne libre, aucun stock à décrémenter
  name: string;
  price: number;
  cost: number;
  category: Category;
  quantity: number;
  /** Variante choisie (ex « Noir M »). Absent = produit classique. */
  variant?: string;
  /** Identifiant de variante (vêtements) — pilote le stock à décrémenter. Absent = stock global. */
  variant_id?: string;
}
