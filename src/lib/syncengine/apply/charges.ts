import type { PosDatabase } from "../../db";
import type { ChargeDeletedPayload, ChargeSavedPayload, SyncOp } from "../types";
import { touch } from "./helpers";

/**
 * Charge enregistrée ou modifiée par un pair.
 *
 * Contrairement à `applyProductUpdated`, ce handler CRÉE aussi : il n'y a pas de
 * `charge.created` distinct (cf. la paire `product.created` + `product.updated`). Avec la
 * garde `!existing` copiée sur `product.updated`, une charge que le patron saisit sur sa
 * caisse ne se poserait JAMAIS chez le pair — précisément le scénario que la
 * synchronisation des charges existe pour couvrir.
 *
 * En revanche on ne réanime pas une charge supprimée localement : le pair peut modifier
 * le montant d'une charge effacée ici, il ne doit pas la faire revenir.
 */
export async function applyChargeSaved(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ChargeSavedPayload;
  if (!pl?.charge_id || !pl.fields) return;
  const existing = await db.charges.get(pl.charge_id);
  if (existing?.deleted_at) return;
  await db.charges.put({ id: pl.charge_id, ...pl.fields, ...touch() });
}

/** Suppression LOGIQUE : le pair pose `deleted_at`, il n'efface rien. */
export async function applyChargeDeleted(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ChargeDeletedPayload;
  if (!pl?.charge_id) return;
  const existing = await db.charges.get(pl.charge_id);
  if (!existing || existing.deleted_at) return;
  await db.charges.put({ ...existing, ...touch(), deleted_at: Date.now() });
}
