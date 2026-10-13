import { touch } from "./internal";
import type { PosDatabase } from "./schema/database";
import { recordMovement } from "./stock";
import type { Product } from "./types/sync";

/**
 * Applique un delta de stock à un produit, ou à une de ses variantes si `variantId`
 * pointe sur une variante existante. Le mouvement est journalisé. Centré ici pour que
 * les trois chemins (vente directe, tournée, annulation) retranchent/restaurent le
 * MÊME stock — celui de la variante quand il y en a une, sinon le stock global.
 * Retourne le produit mis à jour, ou `null` si introuvable.
 */
export async function applyStockDelta(
  db: PosDatabase,
  productId: string,
  quantity: number,
  opts?: {
    variantId?: string;
    reason?: "replenishment" | "sale" | "round" | "cancellation" | "correction" | "creation";
    note?: string;
  },
): Promise<Product | null> {
  const p = await db.products.get(productId);
  if (!p || p.deleted_at) return null;
  const qty = opts?.variantId
    ? (p.variants?.find((v) => v.id === opts.variantId)?.stock ?? 0)
    : p.stock;
  if (!Number.isFinite(qty) && !opts?.variantId) return p; // stock illimité : rien à faire
  if (opts?.variantId) {
    const variant = p.variants?.find((v) => v.id === opts.variantId);
    if (!variant || !Number.isFinite(variant.stock)) return p;
    const updated: Product = {
      ...p,
      variants: (p.variants ?? []).map((v) =>
        v.id === opts.variantId ? { ...v, stock: Math.max(0, (v.stock ?? 0) + quantity) } : v,
      ),
      ...touch(),
    };
    await db.products.put(updated);
    if (quantity !== 0) {
      await recordMovement(db, {
        product_id: p.id,
        product_name: `${p.name} (${variant.name})`,
        delta: quantity,
        reason: opts?.reason ?? "sale",
        note: opts?.note,
      });
    }
    return updated;
  }
  const updated: Product = { ...p, stock: Math.max(0, p.stock + quantity), ...touch() };
  await db.products.put(updated);
  if (quantity !== 0) {
    await recordMovement(db, {
      product_id: p.id,
      product_name: p.name,
      delta: quantity,
      reason: opts?.reason ?? "sale",
      note: opts?.note,
    });
  }
  return updated;
}
