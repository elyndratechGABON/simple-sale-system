// Outbox : les ops en attente de transmission.
//
// Deux lecteurs : le transport (qui pousse l'outbox au relais puis acquitte) et, en
// attendant, les tests de convergence qui rejouent directement les ops. La rétention :
// une op `synced` est purgée après TTL — le rejeu éventuel passe par `processed_ops`,
// jamais par l'outbox. Les ops `pending` (push en échec) ne partent jamais d'ici.
import { getDB } from "../db";
import type { SyncOp } from "./types";

/** Les ops d'un compte encore non acquittées. Le tri à l'application est déterministe. */
export async function listPendingOps(shopId: string): Promise<SyncOp[]> {
  return getDB()
    .sync_ops.where("shop_id")
    .equals(shopId)
    .filter((o) => o.status === "pending")
    .toArray();
}

/** Acquitte des ops localement : la transmission d'un pair est confirmée. */
export async function markOpsSynced(ids: string[]): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.sync_ops, async () => {
    for (const id of ids) {
      const op = await db.sync_ops.get(id);
      if (op && op.status === "pending") {
        await db.sync_ops.put({ ...op, status: "synced" });
      }
    }
  });
}

/** Purge les ops ACQUITTÉES plus âgées que `olderThanMs`. Sans danger : une op purgée qui
 *  serait redélivrée par le relais est simplement sautée par `processed_ops`. */
export async function purgeSyncedOps(olderThanMs: number): Promise<void> {
  const cutoff = Date.now() - olderThanMs;
  const db = getDB();
  const ids = await db.sync_ops
    .where("status")
    .equals("synced")
    .filter((o) => o.created_at < cutoff)
    .primaryKeys();
  if (ids.length > 0) await db.sync_ops.bulkDelete(ids);
}
