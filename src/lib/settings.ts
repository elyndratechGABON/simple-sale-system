// Préférences utilisateur : nom de l'espace de travail, couleur principale, drapeau
// d'onboarding. Elles vivent dans localStorage et NON dans IndexedDB.
//
// Pourquoi cette séparation : IndexedDB est la base métier (ventes, produits, lignes),
// elle sera un jour synchronisée entre appareils. Une préférence d'affichage n'a rien à
// y faire — elle est propre à l'appareil, doit se lire de façon SYNCHRONE au premier
// rendu (localStorage l'est, IndexedDB ne l'est pas) et sa perte est sans gravité.
//
// L'exception assumée est le dossier de documents : un `FileSystemDirectoryHandle` n'est
// pas sérialisable en JSON, il ne peut PAS tenir dans localStorage. Il reste donc dans
// IndexedDB via src/lib/files.ts. Ne pas tenter de « ranger » les deux au même endroit.

const KEY = "pos_preferences";

/** Nature du commerce. Oriente le mode de service proposé à l'onboarding : un restaurant
 * commande avant d'encaisser, un snack encaisse sur-le-champ. */
export type BusinessType = "snack" | "restaurant";

/** Identifiant unique d'un cluster métier. */
export type ClusterId =
  | "retail"
  | "restaurant"
  | "bar"
  | "service"
  | "clothing"
  | "weight"
  | "magasin"
  | "personnalise"
  | "location";

/** Sous-catégorie du cluster "Magasin" — détermine les champs spécifiques dans le formulaire produit. */
export type SubCategory = "electronics" | "appliance" | "furniture" | "hardware_store";

/**
 * Les 6 grands workflows métier qui pilotent l'expérience utilisateur.
 * Le cluster choisi au onboarding active un workflow spécifique.
 */
export type WorkflowType =
  | "direct" // Épicerie, boutique, magasin → Produit → Panier → Paiement → Terminé
  | "order-prep" // Restaurant, fast-food → Commande → Préparation → Servie → Encaissé
  | "open-tab" // Bar avec addition → Ouvrir → Ajouter → Encaisser → Clôturer
  | "service" // Coiffeur, salon → Prestation → Réalisation → Paiement → Terminé
  | "weight" // Boucherie → Produit → Poids/Quantité → Calcul → Paiement → Terminé
  | "rental"; // Location d'actifs → Actif → Période → Caution → Retour

/* ─── Configuration d'un cluster ──────────────────────────────────────────── */

export interface ClusterWorkflow {
  /** `direct` = panier → paiement ; `order-first` = commande → cuisine → paiement. */
  mode: "direct" | "order-first";
  hasTables: boolean;
  hasKitchenPrint: boolean;
  /** Les tables existent mais sont optionnelles — l'utilisateur les active dans Réglages. */
  hasTablesOptional?: boolean;
}

export interface ClusterStock {
  /** `unit` = pièces ; `weight` = kg ; `mixed` = les deux (quincaillerie). */
  unitType: "unit" | "weight" | "mixed";
  hasVariants: boolean;
  showCostPrice: boolean;
  hasExpiryDate: boolean;
  hasSerialNumber: boolean;
}

export interface ClusterFlags {
  allowServiceBooking: boolean;
  hasWeightInput: boolean;
  /** Location : actifs avec disponibilité, caution, pénalités de retard. */
  hasRentalBooking: boolean;
  /** Location : caution obligatoire au moment de la réservation. */
  hasDeposit: boolean;
  /** Location : vue calendrier de disponibilité en temps réel. */
  hasAvailability: boolean;
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
  /** Snack/bar — service direct — ou restaurant/fastfood — commande puis encaissement. */
  businessType: BusinessType;
  /** Profil métier déterminant le comportement de l'interface. */
  cluster: ClusterId;
  /** Sous-catégorie du cluster Magasin (optionnel). */
  subCategory?: SubCategory;
  /** Domaine d'activité libre saisi pour le cluster Personnalisé. */
  customDomain: string;
  /** Stock au kilo ou à l'unité, choisi à l'onboarding pour le cluster Personnalisé. */
  customUnitType?: "unit" | "weight";
  /**
   * Système de tables : commande servie puis encaissée en fin de service (restaurant) vs
   * service direct au comptoir (snack/bar). Faux → la caisse n'affiche que le comptoir.
   */
  tablesEnabled: boolean;
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
}

export const DEFAULT_PREFERENCES: Preferences = {
  workspaceName: "Ma boutique",
  onboarded: false,
  // Restaurant + tables = le comportement historique de l'application (plan de salle
  // toujours affiché) : les comptes déjà enregistrés ne changent pas de mode.
  businessType: "restaurant",
  cluster: "retail",
  customDomain: "",
  tablesEnabled: false,
  tables: ["1", "2", "3", "4", "5", "6"],
  phone: "",
  quarter: "",
  ownerName: "",
  ownerPhoto: "",
  onboardingCompleted: false,
  privacyAccepted: false,
};

/**
 * Registre complet des 8 clusters métier.
 *
 * Les 8 sont `active: true` : retail, restaurant, bar, service, clothing, weight,
 * magasin, personnalise. Tous apparaissent dans l'UI d'onboarding et de réglages.
 */
export const CLUSTER_MAP: Record<ClusterId, ClusterConfig> = {
  /* ── V1 : clusters actifs ─────────────────────────────────────────────── */
  retail: {
    id: "retail",
    label: "Épicerie / Alimentation",
    icon: "ShoppingBag",
    description:
      "Produits du quotidien, stocks, ventes directes. Encaissez et suivez votre activité.",
    workflowType: "direct",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: true,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant / Fast-food",
    icon: "ChefHat",
    description:
      "Menus, commandes, préparation et service. Gérez vos tables et encaissez en fin de service.",
    workflowType: "order-prep",
    workflow: { mode: "order-first", hasTables: true, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: false,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  bar: {
    id: "bar",
    label: "Bar / Snack / Night Club",
    icon: "Coffee",
    description: "Boissons, ventes directes ou commandes ouvertes.",
    workflowType: "open-tab",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false, hasTablesOptional: true },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  service: {
    id: "service",
    label: "Coiffeur / Salon de beauté",
    icon: "Scissors",
    description:
      "Prestations et produits. Sélectionnez le client, ajoutez des services, encaissez.",
    workflowType: "service",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: true,
      hasWeightInput: false,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  clothing: {
    id: "clothing",
    label: "Boutique (Vêtements)",
    icon: "Shirt",
    description: "Vêtements, pagnes, chaussures, accessoires. Variantes taille et couleur.",
    workflowType: "direct",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: true,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  magasin: {
    id: "magasin",
    label: "Magasin spécialisé",
    icon: "Store",
    description: "Électronique, meubles, quincaillerie. Choisissez votre sous-catégorie.",
    workflowType: "direct",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "mixed",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  weight: {
    id: "weight",
    label: "Boucherie / Charcuterie",
    icon: "Weight",
    description:
      "Vente au poids, stock en kg. Saisissez le poids, le prix se calcule automatiquement.",
    workflowType: "weight",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "weight",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: true,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: true,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  personnalise: {
    id: "personnalise",
    label: "Personnalisé",
    icon: "Sparkles",
    description:
      "Votre activité sur mesure : décrivez votre domaine et choisissez un stock au kilo ou à l'unité.",
    // Workflow de base « direct » ; le choix kg/unité se superpose via `customUnitType`.
    workflowType: "direct",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: true,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
      hasRentalBooking: false,
      hasDeposit: false,
      hasAvailability: false,
    },
    active: true,
  },
  location: {
    id: "location",
    label: "Location d'actifs",
    icon: "KeyRound",
    description:
      "Location de chaises, tentes, voitures, maisons. Gérez les actifs, les périodes et les cautions.",
    workflowType: "rental",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: true,
      hasWeightInput: false,
      hasRentalBooking: true,
      hasDeposit: true,
      hasAvailability: true,
    },
    active: true,
  },
};

/** Clusters disponibles dans l'UI (onboarding + réglages). */
export const ACTIVE_CLUSTERS: ClusterConfig[] = Object.values(CLUSTER_MAP).filter((c) => c.active);

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    // Fusion avec les défauts, jamais remplacement : une version future qui ajoute une
    // préférence doit pouvoir lire un enregistrement écrit par la version d'avant.
    return {
      workspaceName: parsed.workspaceName?.trim() || DEFAULT_PREFERENCES.workspaceName,
      onboarded: parsed.onboarded === true,
      businessType: normalizeBusinessType(parsed.businessType),
      cluster: migrateCluster(parsed.cluster, parsed.businessType),
      subCategory: normalizeSubCategory(parsed.subCategory),
      customDomain: typeof parsed.customDomain === "string" ? parsed.customDomain.trim() : "",
      customUnitType: normalizeCustomUnitType(parsed.customUnitType),
      // `!== false` et non `=== true` : un enregistrement écrit avant l'introduction de
      // cette préférence ne porte pas la clé, et le comportement historique est tables
      // activées — la lire comme fausse ferait basculer tous les comptes existants.
      tablesEnabled: parsed.tablesEnabled !== false,
      tables: normalizeTables(parsed.tables),
      phone: parsed.phone?.trim() || "",
      quarter: parsed.quarter?.trim() || "",
      ownerName: parsed.ownerName?.trim() || "",
      ownerPhoto: typeof parsed.ownerPhoto === "string" ? parsed.ownerPhoto : "",
      onboardingCompleted: parsed.onboardingCompleted === true,
      privacyAccepted: parsed.privacyAccepted === true,
    };
  } catch {
    // JSON corrompu ou localStorage inaccessible (mode privé strict) : les défauts
    // valent mieux qu'une application qui refuse de démarrer.
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Quota plein ou stockage refusé : la préférence ne survivra pas au rechargement,
      // mais l'application reste utilisable pour cette session.
    }
  }
  return next;
}

/**
 * Libellés nettoyés, dédoublonnés, ordre de saisie conservé.
 *
 * Le dédoublonnage n'est pas cosmétique : deux entrées « 3 » donneraient deux boutons
 * identiques dans la caisse, dont l'un ouvrirait une seconde addition sur la même table.
 * Une liste vidée retombe sur les défauts — une caisse sans aucune table à proposer
 * n'aurait plus de bouton du tout.
 */
function normalizeTables(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_PREFERENCES.tables;
  const cleaned = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(cleaned));
  return unique.length > 0 ? unique : DEFAULT_PREFERENCES.tables;
}

function normalizeBusinessType(value: unknown): BusinessType {
  return value === "snack" || value === "restaurant" ? value : DEFAULT_PREFERENCES.businessType;
}

function normalizeCluster(value: unknown): ClusterId {
  if (typeof value === "string" && value in CLUSTER_MAP) return value as ClusterId;
  return DEFAULT_PREFERENCES.cluster;
}

/** Migre l'ancien `businessType` vers le nouveau `cluster`. */
function migrateCluster(cluster: unknown, businessType: unknown): ClusterId {
  if (cluster !== undefined) return normalizeCluster(cluster);
  // Migration depuis l'ancien système
  if (businessType === "snack") return "retail";
  if (businessType === "restaurant") return "restaurant";
  return DEFAULT_PREFERENCES.cluster;
}

const VALID_SUB_CATEGORIES: SubCategory[] = [
  "electronics",
  "appliance",
  "furniture",
  "hardware_store",
];

function normalizeSubCategory(value: unknown): SubCategory | undefined {
  if (typeof value === "string" && (VALID_SUB_CATEGORIES as string[]).includes(value))
    return value as SubCategory;
  return undefined;
}

function normalizeCustomUnitType(value: unknown): "unit" | "weight" | undefined {
  return value === "unit" || value === "weight" ? value : undefined;
}

/** Libellés des sous-catégories Magasin pour l'onboarding. */
export const SUB_CATEGORY_LABELS: Record<
  SubCategory,
  { label: string; emoji: string; description: string }
> = {
  electronics: {
    label: "Électronique",
    emoji: "📱",
    description: "Téléphones, ordinateurs, tablettes",
  },
  appliance: {
    label: "Électroménager",
    emoji: "🧊",
    description: "Réfrigérateurs, micro-ondes, ventilateurs",
  },
  furniture: { label: "Meubles", emoji: "🛋️", description: "Canapés, tables, lits, rangements" },
  hardware_store: {
    label: "Quincaillerie",
    emoji: "🔧",
    description: "Outils, tenailles, ciseaux, peignes",
  },
};

/** Description du workflow pour le tutoriel onboarding. */
export const WORKFLOW_DESCRIPTIONS: Record<WorkflowType, { title: string; steps: string[] }> = {
  direct: {
    title: "Vente immédiate",
    steps: ["Sélectionnez les produits", "Ajoutez au panier", "Encaissez et terminé"],
  },
  "order-prep": {
    title: "Commande avec préparation",
    steps: ["Prenez la commande", "Envoyez en préparation", "Servisez, puis encaissez"],
  },
  "open-tab": {
    title: "Commande ouverte",
    steps: ["Ouvrez une addition", "Ajoutez les consommations", "Encaissez et clôturez"],
  },
  service: {
    title: "Prestation",
    steps: ["Choisissez le client", "Sélectionnez la prestation", "Réalisez, puis encaissez"],
  },
  weight: {
    title: "Vente au poids",
    steps: ["Choisissez le produit", "Saisissez le poids", "Le prix se calcule, encaissez"],
  },
  rental: {
    title: "Location d'actifs",
    steps: [
      "Sélectionnez l'actif",
      "Définissez la période et la caution",
      "Remettez et encaissez, puis gérez le retour",
    ],
  },
};
