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
  "retail" | "restaurant" | "bar" | "service" | "clothing" | "weight" | "magasin";

/** Sous-catégorie du cluster "Magasin" — détermine les champs spécifiques dans le formulaire produit. */
export type SubCategory = "electronics" | "appliance" | "furniture" | "hardware_store";

/** Rétrocompat : l'alias `Cluster` est encore utilisé par de nombreux fichiers. */
export type Cluster = ClusterId;

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
  allowDeposit: boolean;
  hasWeightInput: boolean;
}

export interface ClusterConfig {
  id: ClusterId;
  label: string;
  icon: string;
  description: string;
  workflow: ClusterWorkflow;
  stock: ClusterStock;
  flags: ClusterFlags;
  /** false = désactivé dans l'UI mais présent dans l'architecture (V2). */
  active: boolean;
}

export interface Preferences {
  /** Nom de l'entreprise. Affiché dans l'en-tête et en tête des documents exportés. */
  workspaceName: string;
  /** Teinte oklch de la couleur principale, 0–360. Voir `applyTheme`. */
  hue: number;
  /** Passe à true une fois l'assistant de premier lancement terminé ou passé. */
  onboarded: boolean;
  /** Snack/bar — service direct — ou restaurant/fastfood — commande puis encaissement. */
  businessType: BusinessType;
  /** Profil métier déterminant le comportement de l'interface. */
  cluster: Cluster;
  /** Sous-catégorie du cluster Magasin (optionnel). */
  subCategory?: SubCategory;
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
  /** Passe à true une fois le guide fonctionnel terminé ou passé. */
  onboardingCompleted: boolean;
  /** L'utilisateur a accepté la politique de confidentialité. */
  privacyAccepted: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  workspaceName: "Ma boutique",
  // 155 = le vert d'origine codé en dur dans src/styles.css. Garder cette valeur par
  // défaut fait que l'application non configurée est pixel pour pixel celle d'avant.
  hue: 155,
  onboarded: false,
  // Restaurant + tables = le comportement historique de l'application (plan de salle
  // toujours affiché) : les comptes déjà enregistrés ne changent pas de mode.
  businessType: "restaurant",
  cluster: "retail",
  tablesEnabled: false,
  tables: ["1", "2", "3", "4", "5", "6"],
  phone: "",
  quarter: "",
  ownerName: "",
  onboardingCompleted: false,
  privacyAccepted: false,
};

/**
 * Couleurs proposées à l'onboarding et dans les paramètres.
 *
 * Ce sont des TEINTES, pas des couleurs complètes : voir `applyTheme` pour la raison.
 */
export const PRESET_HUES: { label: string; hue: number }[] = [
  { label: "Vert", hue: 155 },
  { label: "Émeraude", hue: 175 },
  { label: "Bleu", hue: 240 },
  { label: "Indigo", hue: 275 },
  { label: "Violet", hue: 310 },
  { label: "Rose", hue: 350 },
  { label: "Rouge", hue: 25 },
  { label: "Orange", hue: 60 },
  { label: "Ocre", hue: 95 },
];

/**
 * Registre complet des 7 clusters métier.
 *
 * Les 7 premiers sont `active: true` (V1) : retail, restaurant, bar, service,
 * clothing, weight, magasin. Tous apparaissent dans l'UI d'onboarding et de réglages.
 */
export const CLUSTER_MAP: Record<ClusterId, ClusterConfig> = {
  /* ── V1 : clusters actifs ─────────────────────────────────────────────── */
  retail: {
    id: "retail",
    label: "Épicerie / Dépôt",
    icon: "ShoppingBag",
    description: "Vente directe : on encaisse sur-le-champ. Prix d'achat visible pour la marge.",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: true,
      hasSerialNumber: false,
    },
    flags: { allowServiceBooking: false, allowDeposit: false, hasWeightInput: false },
    active: true,
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant / Fast-food",
    icon: "ChefHat",
    description:
      "On prend la commande, on sert le plat, puis on encaisse. Système de tables actif.",
    workflow: { mode: "order-first", hasTables: true, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: false,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: { allowServiceBooking: false, allowDeposit: false, hasWeightInput: false },
    active: true,
  },
  bar: {
    id: "bar",
    label: "Snack Bar / Night Club",
    icon: "Coffee",
    description:
      "Service direct au comptoir. Prix d'achat visible. Gestion des consignes. Tables optionnelles.",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false, hasTablesOptional: true },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: { allowServiceBooking: false, allowDeposit: true, hasWeightInput: false },
    active: true,
  },
  service: {
    id: "service",
    label: "Coiffeur / Barbier",
    icon: "Scissors",
    description: "Prestations et produits physiques mêlés. Nom du client, stock actif.",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: { allowServiceBooking: true, allowDeposit: false, hasWeightInput: false },
    active: true,
  },
  clothing: {
    id: "clothing",
    label: "Boutique (Vêtements & Accessoires)",
    icon: "Shirt",
    description: "Vêtements, pagnes, chaussures, accessoires. Variantes taille + couleur.",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      hasVariants: true,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: { allowServiceBooking: false, allowDeposit: false, hasWeightInput: false },
    active: true,
  },
  magasin: {
    id: "magasin",
    label: "Magasin",
    icon: "Store",
    description: "Électronique, électroménager, meubles, quincaillerie. Sous-catégorie au choix.",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "mixed",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: false,
      hasSerialNumber: false,
    },
    flags: { allowServiceBooking: false, allowDeposit: false, hasWeightInput: false },
    active: true,
  },
  weight: {
    id: "weight",
    label: "Boucherie / Charcuterie",
    icon: "Weight",
    description: "Vente au poids (kg). Prix et stock en kilogrammes. Dates de péremption.",
    workflow: { mode: "direct", hasTables: false, hasKitchenPrint: false },
    stock: {
      unitType: "weight",
      hasVariants: false,
      showCostPrice: true,
      hasExpiryDate: true,
      hasSerialNumber: false,
    },
    flags: { allowServiceBooking: false, allowDeposit: false, hasWeightInput: true },
    active: true,
  },
};

/** Clusters disponibles dans l'UI (onboarding + réglages). */
export const ACTIVE_CLUSTERS: ClusterConfig[] = Object.values(CLUSTER_MAP).filter((c) => c.active);

/* ─── Types de produits → inférence automatique du cluster ───────────────── */

export interface ProductType {
  id: string;
  label: string;
  icon: string;
  /** Cluster(s) que ce type de produit implique. Le premier est le plus probable. */
  clusters: ClusterId[];
}

/**
 * Liste des types de produits reconnaissables au Gabon / Afrique centrale.
 * L'ordre est l'ordre d'affichage dans la grille de sélection.
 */
export const PRODUCT_TYPES: ProductType[] = [
  {
    id: "alimentation",
    label: "Épicerie / Alimentation",
    icon: "ShoppingBag",
    clusters: ["retail"],
  },
  { id: "boissons", label: "Boissons", icon: "Coffee", clusters: ["bar", "retail"] },
  { id: "snack_bar", label: "Snack / Bar à cocktails", icon: "Coffee", clusters: ["bar"] },
  { id: "restauration", label: "Restauration", icon: "ChefHat", clusters: ["restaurant"] },
  { id: "coiffure", label: "Coiffure / Beauté", icon: "Scissors", clusters: ["service"] },
  {
    id: "vetements",
    label: "Vêtements / Accessoires",
    icon: "Shirt",
    clusters: ["clothing"],
  },
  { id: "viande", label: "Viande / Poisson", icon: "Weight", clusters: ["weight"] },
];

/**
 * Déduit le cluster à partir des types de produits sélectionnés.
 *
 * Priorité (du plus spécifique au plus générique) :
 *  1. service  — coiffeur, beauté, couture…
 *  2. restaurant — plats cuisinés, restauration
 *  3. weight   — boucherie, poissonnerie
 *  4. clothing — vêtements, pagnes, chaussures
 *  5. hardware — électronique, quincaillerie
 *  6. bar      — boissons seules (sans alimentation)
 *  7. retail   — défaut (épicerie, alimentation)
 */
export function inferCluster(selectedTypeIds: string[]): ClusterId {
  const selected = new Set(selectedTypeIds);
  // Collecte tous les clusters possibles depuis les types sélectionnés
  const clusterHits = new Map<ClusterId, number>();

  for (const pt of PRODUCT_TYPES) {
    if (!selected.has(pt.id)) continue;
    for (let i = 0; i < pt.clusters.length; i++) {
      const c = pt.clusters[i];
      // Le premier cluster de chaque type a plus de poids
      clusterHits.set(c, (clusterHits.get(c) ?? 0) + (pt.clusters.length - i));
    }
  }

  // Ordre de priorité
  const priority: ClusterId[] = [
    "service",
    "restaurant",
    "weight",
    "clothing",
    "magasin",
    "bar",
    "retail",
  ];

  // Cherche le premier cluster de la liste de priorité qui a des hits
  for (const c of priority) {
    if ((clusterHits.get(c) ?? 0) > 0) return c;
  }

  return "retail";
}

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
      hue: normalizeHue(parsed.hue),
      onboarded: parsed.onboarded === true,
      businessType: normalizeBusinessType(parsed.businessType),
      cluster: migrateCluster(parsed.cluster, parsed.businessType),
      subCategory: normalizeSubCategory(parsed.subCategory),
      // `!== false` et non `=== true` : un enregistrement écrit avant l'introduction de
      // cette préférence ne porte pas la clé, et le comportement historique est tables
      // activées — la lire comme fausse ferait basculer tous les comptes existants.
      tablesEnabled: parsed.tablesEnabled !== false,
      tables: normalizeTables(parsed.tables),
      phone: parsed.phone?.trim() || "",
      quarter: parsed.quarter?.trim() || "",
      ownerName: parsed.ownerName?.trim() || "",
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

function normalizeHue(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PREFERENCES.hue;
  return ((n % 360) + 360) % 360;
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
export function applyTheme(hue: number): void {
  if (typeof document === "undefined") return;
  const h = normalizeHue(hue);
  const rot = (delta: number) => (((h + delta) % 360) + 360) % 360;

  const tokens: Record<string, string> = {
    "--primary": `oklch(0.55 0.15 ${h})`,
    "--primary-foreground": `oklch(0.99 0.005 ${h})`,
    "--secondary": `oklch(0.95 0.02 ${h})`,
    "--secondary-foreground": `oklch(0.25 0.05 ${h})`,
    "--accent": `oklch(0.93 0.05 ${h})`,
    "--accent-foreground": `oklch(0.25 0.08 ${h})`,
    "--ring": `oklch(0.55 0.15 ${h})`,
    // Chroma volontairement minuscule : le fond et les bordures ne font que porter une
    // trace de la teinte. Les rendre francs saturerait toute la surface de l'écran.
    "--background": `oklch(0.985 0.005 ${rot(-35)})`,
    "--muted": `oklch(0.96 0.008 ${rot(-5)})`,
    "--border": `oklch(0.9 0.015 ${rot(-5)})`,
    "--input": `oklch(0.9 0.015 ${rot(-5)})`,
    "--chart-1": `oklch(0.55 0.15 ${h})`,
    "--chart-2": `oklch(0.7 0.14 ${rot(15)})`,
    "--chart-3": `oklch(0.62 0.13 ${rot(45)})`,
    "--chart-4": `oklch(0.75 0.15 ${rot(-55)})`,
    "--chart-5": `oklch(0.68 0.14 ${rot(-95)})`,
  };

  for (const [name, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(name, value);
  }

  // La barre d'état d'Android et la fenêtre installée lisent `theme-color`, pas les
  // variables CSS : sans cette ligne l'application installée garderait le vert d'origine
  // autour d'une interface devenue violette.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", `oklch(0.55 0.15 ${h})`);
}

/** Couleur d'aperçu d'une pastille de choix, sans toucher au document. */
export const swatchColor = (hue: number) => `oklch(0.55 0.15 ${hue})`;
