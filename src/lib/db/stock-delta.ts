import { getDB, touch } from "./internal";
import type { PosDatabase } from "./schema/database";
import { recordMovement } from "./stock";
import type { Product } from "./types/sync";
import { getCachedIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";

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
  // Un service est illimité : il n'a pas de stock à retrancher ni à restaurer.
  if (p.type === "service") return p;
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
  await maybeEmitStockLow(db, p, qty, updated.stock, quantity);
  return updated;
}

export type LostStockAlertSeverity = "warning" | "info";

/** Un cri `stock.low` d'un employé, déjà dédupliqué côté `dispatch.ts`. */
export interface LostStockAlert {
  id: string;
  product_id: string;
  device_id: string;
  stock: number;
  threshold: number;
  severity: LostStockAlertSeverity;
  title: string;
  detail: string;
  to: "/stocks";
  created_at: number;
}

/**
 * Les cris de recharge des employés, appliqués chez le propriétaire par `dispatch`
 * (dédup par `low-stock:<produit>:<écran>` — un id stable tant que la situation persiste).
 * Plus récents d'abord, pour la cloche des notifications.
 */
export async function listLostStockAlerts(): Promise<LostStockAlert[]> {
  return getDB().sync_lost_stock_alerts.orderBy("created_at").reverse().toArray() as Promise<
    LostStockAlert[]
  >;
}

/** Franchissement du seuil : le stock passe de > threshold à <= threshold pendant un
 *  déstockage. Un employé le crie au propriétaire (op `stock.low`) — c'est son canal
 *  de demande de recharge quand l'écran du patron n'observe pas son stock directement.
 *  Le franchissement est le test et pas `<=` seul : une seule op par passage, pas une
 *  babille d'ops à chaque vente sous le seuil ; la déduplication côté apply reste la
 *  seconde barrière. Seulement l'employé : le propriétaire voit ses alertes en direct. */
async function maybeEmitStockLow(
  db: PosDatabase,
  p: Product,
  oldStock: number,
  newStock: number,
  quantity: number,
): Promise<void> {
  const threshold = p.min_stock;
  const crossed =
    quantity < 0 && threshold != null && oldStock > threshold && newStock <= threshold;
  if (!crossed) return;
  const identity = getCachedIdentity();
  if (identity?.role !== "employee") return;
  await emitOp(db, identity, {
    type: "stock.low",
    entity_id: p.id,
    payload: {
      product_id: p.id,
      device_id: identity.deviceId,
      stock: newStock,
      threshold,
    },
  });
}
