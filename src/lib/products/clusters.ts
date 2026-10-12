/**
 * Registre centralisé des champs produit par cluster (activité métier).
 * Source unique de vérité pour l'UI, la validation et les tests.
 *
 * Matrice validée (9 clusters × 14 champs) :
 *
 * | Cluster     | name | photo | price | cost | stock | category | unit | weight | expiry | serial | variants | rental | duration | allergens |
 * |-------------|:----:|:-----:|:-----:|:----:|:-----:|:--------:|:----:|:------:|:------:|:------:|:--------:|:------:|:--------:|:---------:|
 * | retail      | ✅   | ✅    | ✅    | ✅   | ✅    | ✅       | ✅   | ✅     | ✅     | ❌     | ✅       | ❌     | ❌       | ❌        |
 * | restaurant  | ✅   | ✅    | ✅    | ✅   | ❌    | ✅       | ❌   | ❌     | ❌     | ❌     | ✅       | ❌     | ❌       | ✅        |
 * | bar         | ✅   | ✅    | ✅    | ✅   | ✅    | ✅       | ❌   | ❌     | ❌     | ❌     | ✅       | ❌     | ❌       | ❌        |
 * | service     | ✅   | ✅    | ✅    | ❌   | ❌    | ✅       | ❌   | ❌     | ❌     | ❌     | ❌       | ✅     | ❌       | ❌        |
 * | clothing    | ✅   | ✅    | ✅    | ✅   | ✅    | ✅       | ❌   | ❌     | ❌     | ❌     | ✅       | ❌     | ❌       | ❌        |
 * | weight      | ✅   | ✅    | ✅    | ✅   | ✅    | ✅       | ✅   | ✅     | ✅     | ❌     | ❌       | ❌     | ❌       | ❌        |
 * | magasin     | ✅   | ✅    | ✅    | ✅   | ✅    | ✅       | ❌   | ❌     | ❌     | ✅     | ✅       | ❌     | ❌       | ❌        |
 * | personnalise| ✅   | ✅    | ✅    | ✅   | ✅    | ✅       | ✅   | ✅     | ❌     | ❌     | ❌       | ❌     | ❌       | ❌        |
 * | location    | ✅   | ✅    | ✅    | ✅   | ✅    | ✅       | ❌   | ❌     | ❌     | ✅     | ❌       | ✅     | ✅       | ❌        |
 */

import { ClusterId } from "@/lib/settings";
import type { FieldKey, ClusterFieldsConfig, ClusterFieldsMap } from "./types";

/** Tous les champs possibles dans l'ordre d'affichage standard */
export const ALL_FIELD_KEYS: FieldKey[] = [
  "name",
  "photo",
  "price",
  "cost",
  "stock",
  "category",
  "unit",
  "weight",
  "expiry",
  "serial",
  "variants",
  "rental",
  "duration",
  "allergens",
];

/** Configuration des champs par cluster */
export const FIELDS_BY_CLUSTER: ClusterFieldsMap = {
  retail: {
    cluster: "retail",
    label: "Épicerie / Alimentation",
    required: ["name", "price", "stock", "category"],
    optional: ["photo", "cost", "unit", "weight", "expiry", "variants"],
    hidden: ["serial", "rental", "duration", "allergens"],
  },
  restaurant: {
    cluster: "restaurant",
    label: "Restaurant / Fast-food",
    required: ["name", "price", "category"],
    optional: ["photo", "cost", "variants", "allergens"],
    hidden: ["stock", "unit", "weight", "expiry", "serial", "rental", "duration"],
  },
  bar: {
    cluster: "bar",
    label: "Bar / Snack / Night Club",
    required: ["name", "price", "stock", "category"],
    optional: ["photo", "cost", "variants"],
    hidden: ["unit", "weight", "expiry", "serial", "rental", "duration", "allergens"],
  },
  service: {
    cluster: "service",
    label: "Coiffeur / Salon de beauté",
    required: ["name", "price", "category"],
    optional: ["photo", "variants", "allergens"],
    hidden: ["cost", "stock", "unit", "weight", "expiry", "serial", "rental", "duration"],
  },
  clothing: {
    cluster: "clothing",
    label: "Boutique (Vêtements)",
    required: ["name", "price", "stock", "category"],
    optional: ["photo", "cost", "variants"],
    hidden: ["unit", "weight", "expiry", "serial", "rental", "duration", "allergens"],
  },
  weight: {
    cluster: "weight",
    label: "Boucherie / Charcuterie",
    required: ["name", "price", "stock", "category", "unit", "weight"],
    optional: ["photo", "cost", "expiry"],
    hidden: ["serial", "variants", "rental", "duration", "allergens"],
  },
  magasin: {
    cluster: "magasin",
    label: "Magasin spécialisé",
    required: ["name", "price", "stock", "category"],
    optional: ["photo", "cost", "serial", "variants"],
    hidden: ["unit", "weight", "expiry", "rental", "duration", "allergens"],
  },
  personnalise: {
    cluster: "personnalise",
    label: "Personnalisé",
    required: ["name", "price", "stock", "category"],
    optional: ["photo", "cost", "unit", "weight", "variants"],
    hidden: ["expiry", "serial", "rental", "duration", "allergens"],
  },
  location: {
    cluster: "location",
    label: "Location d'actifs",
    required: ["name", "price", "stock", "category", "serial", "rental", "duration"],
    optional: ["photo", "cost", "variants"],
    hidden: ["unit", "weight", "expiry", "allergens"],
  },
};

/** Récupère la config de champs pour un cluster */
export function getFieldsForCluster(clusterId: string) {
  return FIELDS_BY_CLUSTER[clusterId as keyof typeof FIELDS_BY_CLUSTER];
}

/** Renvoie la liste des champs affichables (required + optional) pour un cluster */
export function getVisibleFields(clusterId: string): FieldKey[] {
  const config = getFieldsForCluster(clusterId);
  if (!config) return [];
  return [...config.required, ...config.optional];
}

/** Renvoie la liste des champs requis pour un cluster */
export function getRequiredFields(clusterId: string): FieldKey[] {
  const config = getFieldsForCluster(clusterId);
  return config?.required ?? [];
}

/** Vérifie si un champ est requis pour un cluster */
export function isFieldRequired(clusterId: string, field: FieldKey): boolean {
  const config = getFieldsForCluster(clusterId);
  return config?.required.includes(field) ?? false;
}

/** Vérifie si un champ est masqué pour un cluster */
export function isFieldHidden(clusterId: string, field: FieldKey): boolean {
  const config = getFieldsForCluster(clusterId);
  if (!config) return true; // cluster inconnu = tout masqué
  return config.hidden.includes(field);
}

/** Vérifie si un champ est visible (required ou optional) pour un cluster */
export function isFieldVisible(clusterId: string, field: FieldKey): boolean {
  return !isFieldHidden(clusterId, field);
}

/** Renvoie le label lisible d'un cluster */
export function getClusterLabel(clusterId: string): string {
  const config = getFieldsForCluster(clusterId);
  return config?.label ?? clusterId;
}
