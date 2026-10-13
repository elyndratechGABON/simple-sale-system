import type { Category, PaymentMethod } from "@/lib/db";

export interface DayBucket {
  day: number; // minuit local, en ms — même clé de regroupement que src/routes/history.tsx
  revenue: number;
  /** Bénéfice du jour : revenus − coûts d'acquisition. */
  profit: number;
  salesCount: number;
}

export interface CategoryBucket {
  category: Category;
  revenue: number;
  profit: number;
}

export interface TableBucket {
  /** Libellé de la table ; « Comptoir » pour les ventes sans table. */
  label: string;
  revenue: number;
  /** Bénéfice BRUT des ventes de cette table : revenus − coûts figés dans les lignes. */
  profit: number;
  /** Nombre de tournées : groupes de lignes partageant la même vente et le même
   *  `ordered_at`. Une table réglée d'un coup compte autant de tournées que d'heures de
   *  commande ; des tournées encaissées séparément comptent chacune pour une. */
  rounds: number;
  salesCount: number;
  /** Personnes servies — somme des `customers_count` des ventes de la table. */
  clients: number;
}

export interface ProductBucket {
  /** Clé de regroupement : `product_id` du catalogue, nom pour les lignes libres. C'est
   *  ELLE qui relie le lot aux coûts d'acquisition saisis dans les rapports — chercher
   *  par nom fusionnerait deux produits homonymes ET raterait l'enregistrement. */
  product_id: string;
  /** Nom du produit à la vente. Figé dans la ligne comme le prix : une fiche renommée
   *  laisse l'ancien nom sur ses ventes déjà enregistrées. */
  name: string;
  category: Category;
  quantity: number;
  revenue: number;
  /** Bénéfice BRUT : revenus − coûts figés dans les lignes. */
  profit: number;
}

export interface PeriodStats {
  revenue: number;
  /** Bénéfice : revenus − coûts d'acquisition figés dans les lignes de vente. */
  profit: number;
  salesCount: number;
  itemsCount: number;
  /** Nombre de personnes servies. Une vente sans `customers_count` compte pour 1. */
  customersCount: number;
  /** profit / revenue, dans [0,1]. 0 quand il n'y a pas de revenu. */
  marginRate: number;
  /** revenue / salesCount, 0 quand il n'y a pas de vente. */
  averageBasket: number;
  /** Jour au chiffre d'affaires le plus élevé. */
  bestDay: DayBucket | null;
  /** Jour le moins rentable — bénéfice minimum PARMI LES JOURS AYANT EU DES VENTES. Sans
   *  ce filtre le résultat serait toujours un jour de fermeture, ce qui n'apprend rien. */
  worstDay: DayBucket | null;
  /** Croissance entre la 1re et la 2e moitié de la période. `NaN` quand la 1re moitié
   *  n'a rien vendu : il n'y a pas de base de comparaison, et afficher « +0 % » ferait
   *  croire à une stagnation alors que l'activité est partie de zéro. `formatPercent`
   *  rend « — » dans ce cas. */
  growthRate: number;
  byCategory: CategoryBucket[];
  /** Répartition des revenus et bénéfices par table, de la plus rentable à la moins.
   *  Les ventes sans table sont regroupées sous « Comptoir » — c'est ce qui permet de
   *  faire la somme de la colonne sans deviner où est passé le chiffre du comptoir. */
  byTable: TableBucket[];
  /** Classement des produits par chiffre d'affaires décroissant. Clé : `product_id`
   *  quand la ligne vient du catalogue, nom pour les lignes libres — deux produits du
   *  catalogue homonymes ne fusionnent pas. */
  topProducts: ProductBucket[];
  /** Série chronologique COMPLÈTE, jours sans vente inclus à 0 — sinon la courbe
   *  raccourcirait les creux au lieu de les montrer. */
  days: DayBucket[];
}

/** Produit vendu un jour donné — agrégé par clé catalogue (nom pour les lignes libres). */
export interface DayProductBucket {
  product_id: string;
  name: string;
  category: Category;
  quantity: number;
  revenue: number;
}

/** Répartition d'un jour par moyen de paiement. */
export interface PaymentBreakdown {
  method: PaymentMethod;
  count: number;
  total: number;
}

/**
 * Photo complète d'une journée : le contenu du dialogue « détail d'un jour » du
 * calendrier des rapports. Pure et recalculable à la main, comme le reste du module.
 */
export interface DayDetail {
  revenue: number;
  profit: number;
  salesCount: number;
  itemsCount: number;
  /** Personnes servies — une vente sans `customers_count` compte pour 1. */
  customers: number;
  byPayment: PaymentBreakdown[];
  /** Produits triés par chiffre d'affaires décroissant. */
  products: DayProductBucket[];
  /** Noms des clients nommés (services), distincts, dans l'ordre de passage. */
  clients: string[];
  /** Libellés des tables servies, distincts. */
  tables: string[];
}

export interface WeightSalesBucket {
  product_id: string;
  name: string;
  /** Poids total vendu, en kilogrammes. */
  weightKg: number;
  /** Montant (prix au poids × poids), en FCFA. */
  revenue: number;
}

export interface WeightSalesStats {
  /** Poids total vendu sur la période, en kg. */
  weightKg: number;
  /** Chiffre d'affaires des ventes au poids, en FCFA. */
  revenue: number;
  /** Poids moyen d'une pesée sur la période, en kg. NaN sans aucune vente au poids. */
  avgWeightKg: number;
  byProduct: WeightSalesBucket[];
}
