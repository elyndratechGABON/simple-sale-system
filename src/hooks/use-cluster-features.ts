import { usePreferences } from "./use-preferences";
import {
  CLUSTER_MAP,
  type ClusterConfig,
  type ClusterId,
  type ClusterWorkflow,
  type ClusterStock,
  type ClusterFlags,
} from "@/lib/settings";

export type { ClusterConfig, ClusterId, ClusterWorkflow, ClusterStock, ClusterFlags };

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
  // Nouveaux helpers (V2, prêts à l'emploi)
  hasWeightInput: boolean;
  hasVariants: boolean;
  hasExpiryDate: boolean;
  hasSerialNumber: boolean;
  unitType: "unit" | "weight" | "mixed";
  // Flags dépliés au top-level
  allowDeposit: boolean;
  allowServiceBooking: boolean;
} {
  const { cluster } = usePreferences();
  const config = CLUSTER_MAP[cluster as ClusterId] ?? CLUSTER_MAP.restaurant;
  return {
    ...config,
    // Rétrocompat
    hasTables: config.workflow.hasTables,
    showCostPrice: config.stock.showCostPrice,
    isOrderFirst: config.workflow.mode === "order-first",
    isService: config.id === "service",
    // Nouveaux
    hasWeightInput: config.flags.hasWeightInput,
    hasVariants: config.stock.hasVariants,
    hasExpiryDate: config.stock.hasExpiryDate,
    hasSerialNumber: config.stock.hasSerialNumber,
    unitType: config.stock.unitType,
    // Flags
    allowDeposit: config.flags.allowDeposit,
    allowServiceBooking: config.flags.allowServiceBooking,
  };
}
