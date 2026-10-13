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
//
// (types.ts) formes des préférences et clusters ; (defaults.ts) valeurs par défaut ;
// (clusters.ts) registre des clusters ; (store.ts) lecture et écriture localStorage.
export { ACTIVE_CLUSTERS, CLUSTER_MAP, WORKFLOW_DESCRIPTIONS } from "./clusters";
export { DEFAULT_PREFERENCES } from "./defaults";
export { getPreferences, savePreferences } from "./store";
export type {
  ClusterConfig,
  ClusterFlags,
  ClusterId,
  ClusterStock,
  ClusterWorkflow,
  Preferences,
  WorkflowType,
} from "./types";
