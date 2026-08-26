import { usePreferences } from "./use-preferences";
import {
  CLUSTER_MAP,
  type ClusterConfig,
  type ClusterId,
  type ClusterWorkflow,
  type ClusterStock,
  type ClusterFlags,
  type SubCategory,
} from "@/lib/settings";

export type { ClusterConfig, ClusterId, ClusterWorkflow, ClusterStock, ClusterFlags, SubCategory };

/**
 * Résout le `ClusterConfig` complet + helpers dérivés.
 *
 * Les helpers `hasTables`, `showCostPrice`, `isOrderFirst`, `isService` sont
 * rétrocompatibles : les 5 fichiers consommateurs existants les lisent tels quels.
 */
export function useClusterFeatures(): ClusterConfig & {
  // Helpers rétrocompat (littéraux conservés pour ne pas casser les appels existants)
  hasTables: boolean;
  showCostPrice: boolean;
  isOrderFirst: boolean;
  isService: boolean;
  isMagasin: boolean;
  isLocation: boolean;
  // Nouveaux helpers (V2, prêts à l'emploi)
  hasWeightInput: boolean;
  hasVariants: boolean;
  hasExpiryDate: boolean;
  hasSerialNumber: boolean;
  unitType: "unit" | "weight" | "mixed";
  // Flags dépliés au top-level
  allowServiceBooking: boolean;
  hasTablesOptional: boolean;
  // Flags location
  hasRentalBooking: boolean;
  hasDeposit: boolean;
  hasAvailability: boolean;
  // Sous-catégorie magasin
  subCategory?: SubCategory;
} {
  const { cluster, subCategory, customUnitType } = usePreferences();
  let config = CLUSTER_MAP[cluster as ClusterId] ?? CLUSTER_MAP.retail;
  // Cluster Personnalisé : le choix « stock au kilo » posé à l'onboarding surcharge
  // la config de base (qui est à l'unité) pour que caisse et formulaires vendent au poids.
  if (config.id === "personnalise" && customUnitType === "weight") {
    config = {
      ...config,
      workflowType: "weight",
      stock: { ...config.stock, unitType: "weight" },
      flags: { ...config.flags, hasWeightInput: true },
    };
  }
  return {
    ...config,
    // Rétrocompat
    hasTables: config.workflow.hasTables,
    showCostPrice: config.stock.showCostPrice,
    isOrderFirst: config.workflow.mode === "order-first",
    isService: config.id === "service",
    isMagasin: config.id === "magasin",
    isLocation: config.id === "location",
    // Nouveaux
    hasWeightInput: config.flags.hasWeightInput,
    hasVariants: config.stock.hasVariants,
    hasExpiryDate: config.stock.hasExpiryDate,
    hasSerialNumber: config.stock.hasSerialNumber,
    unitType: config.stock.unitType,
    // Flags
    allowServiceBooking: config.flags.allowServiceBooking,
    hasTablesOptional: config.workflow.hasTablesOptional ?? false,
    // Flags location
    hasRentalBooking: config.flags.hasRentalBooking,
    hasDeposit: config.flags.hasDeposit,
    hasAvailability: config.flags.hasAvailability,
    // Sous-catégorie
    subCategory,
  };
}
