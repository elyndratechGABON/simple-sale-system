import Dexie from "dexie";
import { ensureIdentity, getIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";
import { getDB, touch, uid } from "./internal";
import type { PosDatabase } from "./schema/database";
import type { StockMovement } from "./types/records";
import type { Product } from "./types/sync";

/**
 * Ajoute une quantité au stock d'un produit. Stock illimité : opération sans effet
 * (rien à incrémenter). Retourne le produit mis à jour pour affichage immédiat.
 *
 * Les champs optionnels documentent le mouvement dans le journal : prix d'achat saisi
 * (met aussi à jour le coût du produit — c'est le dernier coût d'acquisition connu),
 * fournisseur, note libre.
 */
export async function addStock(
  productId: string,
  quantity: number,
  info?: { unit_cost?: number; supplier?: string; note?: string },
): Promise<Product> {
  await ensureIdentity();
  const db = getDB();
  const p = await db.products.get(productId);
  if (!p || p.deleted_at) throw new Error("Produit introuvable.");
  if (!Number.isFinite(p.stock)) throw new Error("Stock illimité, pas d'initiation possible.");
  const qty = Math.max(0, quantity);
  const costChanged =
    typeof info?.unit_cost === "number" && info.unit_cost > 0 && info.unit_cost !== p.cost;
  const updated: Product = {
    ...p,
    stock: p.stock + qty,
    ...(info?.unit_cost && info.unit_cost > 0 ? { cost: info.unit_cost } : {}),
    ...touch(),
  };
  await db.transaction(
    "rw",
    db.products,
    db.stock_movements,
    db.sync_ops,
    db.settings,
    async () => {
      await db.products.put(updated);
      if (qty > 0) {
        await recordMovement(db, {
          product_id: p.id,
          product_name: p.name,
          delta: qty,
          reason: "replenishment",
          unit_cost: info?.unit_cost,
          supplier: info?.supplier,
          note: info?.note,
        });
        // Le réapprovisionnement est un delta : chaque appareil l'applique à SON stock.
        await emitOp(db, getIdentity(), {
          type: "stock.adjusted",
          entity_id: productId,
          payload: { product_id: productId, delta: qty },
        });
      }
      if (costChanged) {
        // Le prix d'achat renseigné au réappro met à jour la fiche produit : le propager,
        // sinon le coût du pair est en retard sur le sien.
        await emitOp(db, getIdentity(), {
          type: "product.updated",
          entity_id: productId,
          payload: { product_id: productId, fields: { cost: info!.unit_cost } },
        });
      }
    },
  );
  return updated;
}

/**
 * Retire une quantité du stock sans passer par une vente (casse, perte, inventaire).
 * La quantité est bornée au stock présent : un retrait ne crée jamais un négatif.
 */
export async function removeStock(
  productId: string,
  quantity: number,
  note?: string,
): Promise<Product> {
  await ensureIdentity();
  const db = getDB();
  const p = await db.products.get(productId);
  if (!p || p.deleted_at) throw new Error("Produit introuvable.");
  if (!Number.isFinite(p.stock)) throw new Error("Stock illimité, rien à retirer.");
  const qty = Math.min(Math.max(0, quantity), p.stock);
  const updated: Product = { ...p, stock: p.stock - qty, ...touch() };
  await db.transaction(
    "rw",
    db.products,
    db.stock_movements,
    db.sync_ops,
    db.settings,
    async () => {
      await db.products.put(updated);
      if (qty > 0) {
        await recordMovement(db, {
          product_id: p.id,
          product_name: p.name,
          delta: -qty,
          reason: "correction",
          note,
        });
        await emitOp(db, getIdentity(), {
          type: "stock.adjusted",
          entity_id: productId,
          payload: { product_id: productId, delta: -qty },
        });
      }
    },
  );
  return updated;
}

/**
 * Recharge à distance : le propriétaire envoie +qty à UN écran employé. La cible est
 * dans le payload (`target_device_id`) — même modèle que l'instantané de catalogue.
 * PAS de mouvement local ni de delta sur le stock du propriétaire : sa fiche est le
 * dépôt, c'est LUI qui décide d'en retirer la quantité (les stocks des écrans divergent).
 */
export async function sendRecharge(
  productId: string,
  targetDeviceId: string,
  quantity: number,
): Promise<void> {
  await ensureIdentity();
  const db = getDB();
  const p = await db.products.get(productId);
  if (!p || p.deleted_at) throw new Error("Produit introuvable.");
  const qty = Math.max(0, Math.round(quantity));
  if (!qty) throw new Error("Quantité invalide.");
  await emitOp(db, getIdentity(), {
    type: "stock.adjusted",
    entity_id: productId,
    payload: { product_id: productId, delta: qty, target_device_id: targetDeviceId },
  });
}

/**
 * Écrit une ligne du journal des mouvements. À appeler DANS la transaction qui modifie
 * le stock : un mouvement sans variation correspondante serait un mensonge, et
 * l'inverse aussi. Journal plafonné aux 2 000 dernières lignes — c'est un outil de
 * compréhension, pas une archive comptable (les ventes, elles, restent complètes).
 */
export async function recordMovement(
  db: PosDatabase,
  input: Omit<StockMovement, "id" | "created_at">,
): Promise<void> {
  await db.stock_movements.put({ ...input, id: uid(), created_at: Date.now() });
  const count = await db.stock_movements.count();
  if (count > 2000) {
    const excess = count - 2000;
    const oldest = await db.stock_movements.orderBy("created_at").limit(excess).toArray();
    await db.stock_movements.bulkDelete(oldest.map((m) => m.id));
  }
}

/** Journal des mouvements, du plus récent au plus ancien ; par produit si demandé. */
export async function listStockMovements(opts?: {
  productId?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  const db = getDB();
  const limit = opts?.limit ?? 50;
  const table = opts?.productId
    ? db.stock_movements
        .where("[product_id+created_at]")
        .between([opts.productId, Dexie.minKey], [opts.productId, Dexie.maxKey])
    : db.stock_movements.orderBy("created_at");
  const rows = await table.reverse().limit(limit).toArray();
  return rows;
}
