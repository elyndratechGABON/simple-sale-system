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
    const newStock = (variant.stock ?? 0) + quantity;
    const updated: Product = {
      ...p,
      variants: (p.variants ?? []).map((v) =>
        v.id === opts.variantId ? { ...v, stock: newStock } : v,
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
    if (newStock < 0 && quantity < 0) {
      await raiseStockConflict(db, p, newStock, quantity, "variant");
    }
    return updated;
  }
  // Le delta s'applique INTÉGRALEMENT : un conflit de ventes concurrentes peut
  // pousser le stock sous zéro. On ne borne PAS — le négatif affiché est le signal
  // honnête de la survente, l'alerte part au gérant (`raiseStockConflict`).
  const newStock = p.stock + quantity;
  const updated: Product = { ...p, stock: newStock, ...touch() };
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
  await maybeEmitStockLow(db, p, p.stock, newStock, quantity);
  if (newStock < 0 && quantity < 0) {
    await raiseStockConflict(db, p, newStock, quantity, "product");
  }
  return updated;
}

/**
 * CONFLIT DE STOCK — deux vendeurs vendent le même stock en même temps : la somme
 * des ventes dépasse le disponible. La vente n'est PAS annulée (l'argent est en
 * caisse, le produit est parti), mais le gérant est alerté et le stock reste
 * négatif jusqu'au réassort — l'état affiché est honnête.
 *
 * Le conflit est écrit deux fois : LOCALEMENT (fiche `sync_lost_stock_alerts`,
 * la cloche le lit) et en op `stock.conflict` (les autres écrans, gérant
 * compris, l'appliquent par `dispatch`). Dédup : une fiche tant que le stock
 * reste négatif, puis une nouvelle au prochain conflit.
 */
const STOCK_CONFLICT_ID = "stock-conflict";
export async function raiseStockConflict(
  db: PosDatabase,
  p: Product,
  newStock: number,
  quantity: number,
  scope: "product" | "variant",
): Promise<void> {
  const identity = getCachedIdentity();
  const id = `${STOCK_CONFLICT_ID}:${p.id}:${identity?.deviceId ?? "me"}`;
  await db.transaction("rw", db.sync_lost_stock_alerts, async () => {
    await db.sync_lost_stock_alerts.put({
      id,
      product_id: p.id,
      device_id: identity?.deviceId ?? "",
      stock: newStock,
      threshold: 0,
      severity: "warning",
      title: "Conflit de stock",
      detail: `Survente : ${scope === "variant" ? "une variante de " : ""}${p.name} à ${newStock} (${quantity} unités vendues au-delà du stock)`,
      to: "/stocks",
      created_at: Date.now(),
    });
  });
  if (identity) {
    await emitOp(db, identity, {
      type: "stock.conflict",
      entity_id: p.id,
      payload: {
        product_id: p.id,
        device_id: identity.deviceId,
        stock: newStock,
        quantity,
        scope,
      },
    });
  }
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
