import type { PosDatabase } from "../../db";
import { enforceServiceUnlimited } from "../../db/products";
import { recordMovement } from "../../db/stock";
import { uid } from "../../db/internal";
import { getIdentity } from "../identity";
import type {
  ProductCreatedPayload,
  ProductUpdatedPayload,
  StockAdjustedPayload,
  SyncOp,
} from "../types";
import type { Product } from "../../db/types/sync";
import { touch } from "./helpers";

export async function applyProductCreated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ProductCreatedPayload;
  if (!pl?.product?.id || pl.product.deleted_at) return;
  const etranger = !!op.device_id && op.device_id !== getIdentity().deviceId;
  // Un produit créé PAR UN AUTRE écran n'est jamais privé : l'employé n'a pas le droit
  // de créer du privé (le champ ne naît que par le toggle du formulaire propriétaire).
  // Le retrait est défensif — un payload qui forgerait le flag est neutralisé ici.
  const entrant: Product = etranger ? { ...pl.product, is_private: undefined } : { ...pl.product };
  const existing = await db.products.get(entrant.id);
  if (!existing) {
    // Le CONCEPT : une prestation (type « service ») est TOUJOURS illimitée.
    await db.products.put(enforceServiceUnlimited(entrant));
    return;
  }
  // Upsert : le rejeu de son PROPRE produit n'écrase pas une suppression locale.
  if (existing.deleted_at) return; // pierre tombale locale : elle fait foi
  if (!etranger) return;
  // CONFLIT D'ID (rare) : la clé est déjà celle d'un produit VIVANT détenu par un
  // AUTRE appareil. Personne ne perd sa fiche : l'entrant arrive avec un nom DISTINCT
  // (« nom (employé) ») et une clé NEUVE — la clé d'origine est référencée ailleurs
  // (ventes, mouvements), on ne réétiquette jamais rien.
  const peer = await db.paired_devices.get(op.device_id);
  const detail = peer?.device_name?.trim() || "employé";
  await db.products.put(
    enforceServiceUnlimited({
      ...entrant,
      id: uid(),
      name: `${entrant.name} (${detail})`,
    }),
  );
}

export async function applyProductUpdated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ProductUpdatedPayload;
  if (!pl?.product_id) return;
  const existing = await db.products.get(pl.product_id);
  if (!existing || existing.deleted_at) return;
  // Le CONCEPT : une prestation (type « service ») est TOUJOURS illimitée.
  await db.products.put(enforceServiceUnlimited({ ...existing, ...pl.fields, ...touch() }));
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
  // Recharge à distance : un delta adressé à UN écran n'enrichit que lui — même modèle
  // que `catalogue.snapshot` (l'instantané ignoré s'il ne me vise pas).
  if (pl.target_device_id && pl.target_device_id !== getIdentity().deviceId) return;
  const existing = await db.products.get(pl.product_id);
  // Stock illimité : rien à ajuster. Produit absent : il arrivera avec sa création.
  if (!existing || existing.deleted_at || !Number.isFinite(existing.stock)) return;
  await db.products.put({
    ...existing,
    stock: Math.max(0, existing.stock + pl.delta),
    ...touch(),
  });
  // Trace visible côté récepteur : le journal des mouvements suffit — pas d'onglet
  // « Réception » à ajouter tant que le journal dit déjà qui a reçu quoi, quand.
  await recordMovement(db, {
    product_id: existing.id,
    product_name: existing.name,
    delta: pl.delta,
    reason: "replenishment",
    note: op.device_id ? "Recharge à distance" : undefined,
  });
}
