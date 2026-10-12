/**
 * Registre des champs produits par cluster (activité métier).
 * Source unique de vérité pour l'UI, la validation et les tests.
 * Ne pas modifier directement — éditer la matrice dans clusters.ts.
 */

import { ClusterId } from "@/lib/settings";

/** Clé de champ produit — correspond aux clés du registre FIELDS_BY_CLUSTER */
export type FieldKey =
  | "name"
  | "photo"
  | "price"
  | "cost"
  | "stock"
  | "category"
  | "unit"
  | "weight"
  | "expiry"
  | "serial"
  | "variants"
  | "rental"
  | "duration"
  | "allergens";

/** Configuration des champs pour un cluster donné */
export interface ClusterFieldsConfig {
  /** Nom du cluster (ex: "retail") */
  cluster: ClusterId;
  /** Libellé lisible */
  label: string;
  /** Champs obligatoires (toujours affichés) */
  required: FieldKey[];
  /** Champs optionnels (affichés si pertinents) */
  optional: FieldKey[];
  /** Champs masqués (jamais affichés pour ce cluster) */
  hidden: FieldKey[];
}

/** Clé pour récupérer la config d'un cluster */
export type ClusterFieldsMap = Record<ClusterId, ClusterFieldsConfig> & {
  [key: string]: ClusterFieldsConfig | undefined;
};

/** Props de base pour un champ de formulaire produit */
export interface ProductFieldProps {
  /** Valeur courante */
  value: unknown;
  /** Callback de changement */
  onChange: (value: unknown) => void;
  /** Erreur de validation */
  error?: string;
  /** Label affiché */
  label: string;
  /** Placeholder */
  placeholder?: string;
  /** Désactivé */
  disabled?: boolean;
  /** Requis */
  required?: boolean;
}
