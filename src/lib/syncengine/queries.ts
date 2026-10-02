// Invalidation des lectures après une écriture.
//
// Un seul endroit à connaître : toute fonction qui MODIFIE une table lisible par un
// écran passe par ici. Le symptôme « le stock ne se met pas à jour » vient presque
// toujours d'une écriture faite sans invalider la lecture correspondante — et comme
// chaque écran lit sous une clé qui lui est propre (`products` dans Stocks, dans la
// Caisse, sur l'accueil…), l'oubli ne saute pas aux yeux.
//
// Ce module ne dépend PAS de React : l'import est dynamique pour que le moteur de sync
// reste utilisable hors d'un composant (tests, tâche de fond).

import type { QueryClient } from "@tanstack/react-query";

/**
 * Les lectures alimentées par les tables que la synchronisation écrit.
 *
 * - `products` : stock, catalogue, variantes.
 * - `sales` et `sale_items` : historique, rapports, tableau de bord.
 * - `paired_devices` / `sync_identity` / `account_quota` : appareils et rôles.
 *
 * Un préfixe suffit : React Query invalide aussi toutes les clés qui commencent par
 * celui-ci, donc `["sales"]` couvre `["sales", "range", from, to]` de `usePeriodData`
 * comme `["sales", "bestsellers"]`.
 */
export const SYNC_INVALIDATED_QUERIES = [
  "products",
  "sales",
  "sale_items",
  "movements",
  "paired_devices",
  "sync_identity",
  "account_quota",
  "clients",
] as const;

let cachedClient: QueryClient | null = null;

/**
 * Enregistre le `QueryClient` du provider.
 *
 * Appelé une fois par l'application. Le moteur de sync tourne dans un `useEffect` de
 * `_app.tsx`, donc un accès direct au contexte y est possible — et stocké ici pour que
 * les couches basses n'aient pas à recevoir le client en paramètre partout.
 */
export function setQueryClient(client: QueryClient): void {
  cachedClient = client;
}

/** Libère la référence (tests, démontage). */
export function clearQueryClient(): void {
  cachedClient = null;
}

/**
 * Rafraîchit les lectures concernées. Silencieux si aucun client n'est enregistré :
 * la modification est faite dans IndexedDB, l'écran qui se remontera lira la bonne
 * valeur. Perdre un rafraîchissement n'est jamais un risque de données, seulement un
 * risque d'affichage retardé.
 */
export async function invalidateSyncQueries(): Promise<void> {
  if (!cachedClient) return;
  await Promise.all(
    SYNC_INVALIDATED_QUERIES.map((key) => cachedClient?.invalidateQueries({ queryKey: [key] })),
  );
}