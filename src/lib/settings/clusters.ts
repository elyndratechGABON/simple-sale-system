import type { ClusterConfig, ClusterId, WorkflowType } from "./types";

/**
 * Registre complet des 4 clusters métier.
 *
 * Les 4 sont `active: true` : restaurant, bar, service, personnalise.
 * Tous apparaissent dans l'UI d'onboarding et de réglages.
 */
export const CLUSTER_MAP: Record<ClusterId, ClusterConfig> = {
  /* ── Clusters actifs ─────────────────────────────────────────────── */
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
      showCostPrice: false,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
    },
    active: true,
  },
  bar: {
    id: "bar",
    label: "Bar / Snack / Night Club",
    icon: "Coffee",
    description: "Boissons, ventes directes ou commandes ouvertes.",
    workflowType: "open-tab",
    workflow: { mode: "direct", hasTables: true, hasKitchenPrint: false },
    stock: {
      unitType: "unit",
      showCostPrice: true,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
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
      showCostPrice: true,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: true,
      hasWeightInput: false,
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
      showCostPrice: true,
      hasSerialNumber: false,
    },
    flags: {
      allowServiceBooking: false,
      hasWeightInput: false,
    },
    active: true,
  },
};

/** Clusters disponibles dans l'UI (onboarding + réglages). */
export const ACTIVE_CLUSTERS: ClusterConfig[] = Object.values(CLUSTER_MAP).filter((c) => c.active);

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
};
