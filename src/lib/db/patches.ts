import type { Client } from "./types/records";
import type { Product } from "./types/sync";

// ---------- Patchs de synchronisation ----------
// Les champs propagés par `product.updated` / `client.updated`. Jamais `id`, `stock`
// (qui passe par les deltas), ni les champs de sync eux-mêmes (`updated_at`,
// `deleted_at`, `sync_status`) — ils sont réécrits localement par chaque appareil au
// moment où il applique l'op. `photo` est propagé : image déjà réduite en webp ~256 px
// (~5-30 Ko), assez légère pour passer par le relais sans surcharge.

export const SYNC_EXCLUDED = new Set([
  "id",
  "stock",
  "updated_at",
  "deleted_at",
  "sync_status",
  "last_op",
]);

export function productPatch(
  previous: Product | undefined,
  next: Product,
): Record<string, unknown> | null {
  if (!previous) return null;
  const prev = previous as unknown as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (SYNC_EXCLUDED.has(key)) continue;
    if (value !== prev[key]) fields[key] = value;
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

export function clientPatch(
  previous: Client | undefined,
  next: Client,
): Record<string, unknown> | null {
  if (!previous) return null;
  const prev = previous as unknown as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (SYNC_EXCLUDED.has(key)) continue;
    if (value !== prev[key]) fields[key] = value;
  }
  return Object.keys(fields).length > 0 ? fields : null;
}
