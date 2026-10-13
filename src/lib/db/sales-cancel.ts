import { ensureIdentity, getIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";
import { isClosed } from "./closing";
import { getDB, touch } from "./internal";
import { applyStockDelta } from "./stock-delta";

/**
 * Annule une vente : réintègre les stocks et marque vente + lignes comme supprimées.
 * La suppression est LOGIQUE — les enregistrements restent en base pour qu'une
 * synchronisation future puisse propager l'annulation à un autre appareil.
 */
export async function cancelSale(saleId: string): Promise<void> {
  await ensureIdentity();
  const db = getDB();
  await db.transaction(
    "rw",
    [db.sales, db.sale_items, db.products, db.stock_movements, db.sync_ops, db.settings],
    async () => {
      const sale = await db.sales.get(saleId);
      if (!sale || sale.deleted_at) return;
      if (isClosed(sale)) {
        throw new Error("Journée clôturée, annulation impossible.");
      }
      const deleted_at = Date.now();
      const items = await db.sale_items.where("sale_id").equals(saleId).toArray();
      for (const item of items) {
        if (item.deleted_at) continue;
        if (item.product_id) {
          await applyStockDelta(db, item.product_id, item.quantity, {
            variantId: item.variant_id,
            reason: "cancellation",
            note: `Vente annulée`,
          });
        }
        await db.sale_items.put({ ...item, ...touch(), deleted_at });
      }
      await db.sales.put({ ...sale, ...touch(), deleted_at });
      // Seules les ventes RÉGLÉES ont rejoint les pairs (via `sale.created` de
      // `createSale`, `payTable` et `payRound`) : leur annulation restaure leur stock à
      // distance. Une addition encore ouverte — `status: "open"` — n'a jamais quitté
      // l'appareil (les tournées ne propagent rien), la propager créerait une
      // restauration fantôme chez des pairs qui n'ont jamais décrémenté.
      if (sale.status !== "open") {
        await emitOp(db, getIdentity(), {
          type: "sale.cancelled",
          entity_id: saleId,
          payload: { sale_id: saleId },
        });
      }
    },
  );
}
