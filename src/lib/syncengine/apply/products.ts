import type { PosDatabase } from "../../db";
import type {
  ProductCreatedPayload,
  ProductUpdatedPayload,
  StockAdjustedPayload,
  SyncOp,
} from "../types";
import { touch } from "./helpers";

export async function applyProductCreated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ProductCreatedPayload;
  if (!pl?.product?.id || pl.product.deleted_at) return;
  // Upsert : le rejeu d'un pair ne doit pas écraser une suppression locale.
  const existing = await db.products.get(pl.product.id);
  if (existing?.deleted_at) return;
  await db.products.put(pl.product);
}

export async function applyProductUpdated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ProductUpdatedPayload;
  if (!pl?.product_id) return;
  const existing = await db.products.get(pl.product_id);
  if (!existing || existing.deleted_at) return;
  await db.products.put({ ...existing, ...pl.fields, ...touch() });
}

export async function applyProductDeleted(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as { product_id: string };
  if (!pl?.product_id) return;
  const existing = await db.products.get(pl.product_id);
  if (!existing || existing.deleted_at) return;
  await db.products.put({ ...existing, ...touch(), deleted_at: Date.now() });
}

export async function applyStockAdjusted(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as StockAdjustedPayload;
  if (!pl?.product_id || typeof pl.delta !== "number" || !Number.isFinite(pl.delta)) return;
  const existing = await db.products.get(pl.product_id);
  // Stock illimité : rien à ajuster. Produit absent : il arrivera avec sa création.
  if (!existing || existing.deleted_at || !Number.isFinite(existing.stock)) return;
  await db.products.put({
    ...existing,
    stock: Math.max(0, existing.stock + pl.delta),
    ...touch(),
  });
}
