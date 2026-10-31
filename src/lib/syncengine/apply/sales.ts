import { isClosed } from "../../db";
import { raiseStockConflict } from "../../db/stock-delta";
import type { PosDatabase } from "../../db";
import type { SaleCancelledPayload, SaleCreatedPayload, SyncOp } from "../types";
import { touch } from "./helpers";

export async function applySaleCreated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as SaleCreatedPayload;
  if (!pl?.sale?.id || pl.sale.deleted_at) return;
  if (await db.processed_ops.get(op.id)) return; // idempotence : rejoué = zéro effet
  await db.processed_ops.put({ id: op.id, processed_at: Date.now() });
  await db.sales.put(pl.sale);
  for (const item of pl.items ?? []) {
    if (item.id) await db.sale_items.put(item);
    // Miroir de la caisse émettrice : l'achat sort du stock à la commande. Le stock
    // et le déficit se portent à vue du pair comme sur l'appareil d'origine.
    if (item.product_id) {
      const p = await db.products.get(item.product_id);
      // Un service est illimité : même garde que `applyStockDelta`, pas de décrément.
      if (p && p.type !== "service" && Number.isFinite(p.stock)) {
        // Variante : le stock a quitté la VARIANTE sur la caisse émettrice (comme
        // `applyStockDelta`) — le pair doit ajuster la même, pas le stock global.
        const variant = item.variant_id && p.variants?.find((v) => v.id === item.variant_id);
        const newStock = variant ? (variant.stock ?? 0) - item.quantity : p.stock - item.quantity;
        await db.products.put(
          variant
            ? {
                ...p,
                variants: (p.variants ?? []).map((v) =>
                  v.id === item.variant_id ? { ...v, stock: newStock } : v,
                ),
                ...touch(),
              }
            : { ...p, stock: newStock, ...touch() },
        );
        // CONFLIT DE STOCK : des ventes concurrentes ont épuisé le stock. La vente
        // est enregistrée, le gérant est alerté, le négatif reste visible jusqu'au
        // réassort.
        if (newStock < 0) {
          await raiseStockConflict(
            db,
            p,
            newStock,
            -item.quantity,
            variant ? "variant" : "product",
          );
        }
      }
    }
  }
}

export async function applySaleCancelled(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as SaleCancelledPayload;
  if (!pl?.sale_id) return;
  const sale = await db.sales.get(pl.sale_id);
  if (!sale || sale.deleted_at) return;
  // Miroir de la garde locale `cancelSale` : une vente verrouillée — clôturée à la
  // main ou écoulée depuis 24 h — n'est pas annulable, même quand l'op arrive d'un
  // pair. L'émetteur a déjà refusé de l'annuler sur sa machine ; un décalage
  // d'horloge ne doit pas pouvoir réécrire un historique clôturé ici non plus.
  if (isClosed(sale)) return;
  const deleted_at = Date.now();
  const items = await db.sale_items.where("sale_id").equals(sale.id).toArray();
  for (const item of items) {
    if (item.product_id) {
      const p = await db.products.get(item.product_id);
      if (p && Number.isFinite(p.stock)) {
        const variant = item.variant_id && p.variants?.find((v) => v.id === item.variant_id);
        await db.products.put(
          variant
            ? {
                ...p,
                variants: (p.variants ?? []).map((v) =>
                  v.id === item.variant_id ? { ...v, stock: (v.stock ?? 0) + item.quantity } : v,
                ),
                ...touch(),
              }
            : { ...p, stock: p.stock + item.quantity, ...touch() },
        );
      }
    }
    if (!item.deleted_at) {
      await db.sale_items.put({ ...item, ...touch(), deleted_at });
    }
  }
  await db.sales.put({ ...sale, ...touch(), deleted_at });
}
