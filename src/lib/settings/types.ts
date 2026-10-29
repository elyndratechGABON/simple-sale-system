import type { ProductCardField } from "@/lib/card-display";

/** Identifiant unique d'un cluster métier. */
export type ClusterId = "restaurant" | "bar" | "service" | "personnalise";

/**
 * Les 4 grands workflows métier qui pilotent l'expérience utilisateur.
 * Le cluster choisi au onboarding active un workflow spécifique.
 */
export type WorkflowType =
  | "direct" // Personnalisé → Produit → Panier → Paiement → Terminé
  | "order-prep" // Restaurant, fast-food → Commande → Préparation → Servie → Encaissé
  | "open-tab" // Bar avec addition → Ouvrir → Ajouter → Encaisser → Clôturer
  | "service"; // Coiffeur, salon → Prestation → Réalisation → Paiement → Terminé

/* ─── Configuration d'un cluster ──────────────────────────────────────────── */

export interface ClusterWorkflow {
  /** `direct` = panier → paiement ; `order-first` = commande → cuisine → paiement. */
  mode: "direct" | "order-first";
  /** Les tables existent et sont proposées. `false` = aucun écran de tables : le
   *  cluster les masque dans Réglages au lieu d'en proposer puis de les laisser
   *  vides. L'ancien `hasTablesOptional` offrait un interrupteur pour un cluster
   *  dépourvu de tables ; plus aucun code ne le lisait, il est retiré. */
  hasTables: boolean;
  hasKitchenPrint: boolean;
}

export interface ClusterStock {
  /** `unit` = pièces ; `weight` = kg ; `mixed` = les deux (quincaillerie). */
  unitType: "unit" | "weight" | "mixed";
  hasVariants?: boolean;
  showCostPrice: boolean;
  hasSerialNumber: boolean;
}

export interface ClusterFlags {
  allowServiceBooking: boolean;
  hasWeightInput: boolean;
}

export interface ClusterConfig {
  id: ClusterId;
  label: string;
  icon: string;
  description: string;
  /** Le workflow métier qui pilote l'expérience utilisateur pour ce cluster. */
  workflowType: WorkflowType;
  workflow: ClusterWorkflow;
  stock: ClusterStock;
  flags: ClusterFlags;
  /** false = désactivé dans l'UI mais présent dans l'architecture (V2). */
  active: boolean;
}

export interface Preferences {
  /** Nom de l'entreprise. Affiché dans l'en-tête et en tête des documents exportés. */
  workspaceName: string;
  /** Passe à true une fois l'assistant de premier lancement terminé ou passé. */
  onboarded: boolean;
  /** Profil métier déterminant le comportement de l'interface. */
  cluster: ClusterId;
  /** Domaine d'activité libre saisi pour le cluster Personnalisé. */
  customDomain: string;
  /** Stock au kilo ou à l'unité, choisi à l'onboarding pour le cluster Personnalisé. */
  customUnitType?: "unit" | "weight";
  /** Fonctionnalités activées pour cette boutique — découplées du cluster. */
  features: {
    /** Plan de salle (tables) : ajoute le système de tables à la caisse. */
    tables: boolean;
    /** État de l'abonnement de la boutique. */
    subscription?: "actif" | "essai" | "expiré" | "inconnu";
  };
  /**
   * Système de tables : commande servie puis encaissée en fin de service (restaurant) vs
   * service direct au comptoir (snack/bar). Faux → la caisse n'affiche que le comptoir.
   * @deprecated Utiliser features.tables à la place.
   */
  tablesEnabled?: boolean;
  /**
   * Libellés des tables proposés à la caisse. La liste s'étend à la volée quand on ouvre
   * une table qui n'y figure pas encore.
   *
   * Ici et non en IndexedDB : c'est de la configuration d'affichage, pas de la donnée
   * métier. Le revers assumé — les préférences sont exclues de la sauvegarde (cf.
   * `exportSnapshot`), donc une restauration sur un autre appareil ne ramène pas cette
   * liste. Aucune donnée n'est perdue pour autant : le libellé de la table est FIGÉ sur
   * chaque vente (`Sale.table`), comme les prix le sont sur chaque ligne.
   */
  tables: string[];
  /** Préférence de fond d'écran (gradient personnalisé). Absent = défaut émeraude. */
  wallpaper?: string;
  /** Module de fond d'écran dégradé (option). */
  use_gradient_bg?: boolean;
  /** Numéro de téléphone du commerce. */
  phone: string;
  /** Quartier / quartier où se situe le commerce. */
  quarter: string;
  /** Nom du propriétaire du commerce. */
  ownerName: string;
  /** Photo de profil du propriétaire, dataURL webp réduit à 128 px (en-tête, avatar). */
  ownerPhoto?: string;
  /** Passe à true une fois le guide fonctionnel terminé ou passé. */
  onboardingCompleted: boolean;
  /** L'utilisateur a accepté la politique de confidentialité. */
  privacyAccepted: boolean;
  /**
   * Champs visibles ET leur ordre sur les cards produit de /stocks. Liste ordonnée :
   * l'ordre du tableau EST l'ordre d'affichage (§12).
   */
  stockCardFields: ProductCardField[];
  /**
   * Même chose pour les cards de la caisse. Réglage SÉPARÉ (§22) : au comptoir on veut
   * le prix et le nom, pas le prix d'achat ni la référence — les deux pages n'ont pas
   * les mêmes contraintes de place ni les mêmes necessités.
   */
  /**
   * Jeu de champs de la caisse. RÉGLAGE SÉPARÉ (22) : au comptoir on veut
   * le prix et le nom, pas le prix d'achat ni la référence — les deux pages n'ont pas
   * les mêmes contraintes de place ni les mêmes nécessités.
   */
  caisseCardFields: ProductCardField[];
  /**
   * Fréquence d'archivage financier automatique, en JOURS (mission archives — Étape 3).
   * À chaque boot, si la différence en jours depuis le DERNIER snapshot atteint ce
   * nombre, `ensureFinancialSnapshot` archive la journée écoulée. Défaut : 7 (une fois
   * par semaine). Options du dialogue d'archives : 1, 5, 7, 30.
   */
  snapshotFrequency?: number;
}
