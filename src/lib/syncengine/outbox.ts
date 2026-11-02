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

// ── Purge d'URGENCE (anti-crash, mission mémoire) ────────────────────────────────
// Une outbox qui gonfle sans borne (3746 ops = 173 Mo avec les photos embarquées)
// fait crasher l'application au démarrage : toute lecture complète (`toArray`) charge
// TOUT en RAM. Au boot, au-delà du seuil, on ne garde que les ops LES PLUS RÉCENTES
// — le démarrage redevient instantané. Les ops purgées avant leur push ne partent
// pas au relais : c'est le prix de la stabilité, payé une fois (les écritures métier,
// elles, restent dans les tables locales — seule la PROPAGATION est perdue).
const OUTBOX_SATURATION = 200;
const OUTBOX_GARDE = 50;

export async function purgeOutboxEmergency(): Promise<number> {
  const db = getDB();
  const total = await db.sync_ops.count();
  if (total <= OUTBOX_SATURATION) return 0;
  console.warn(
    `[outbox] saturée (${total} ops) — purge d'urgence, garde des ${OUTBOX_GARDE} dernières.`,
  );
  // `orderBy` (index created_at) + offset : on ne charge QUE les clés au-delà de la
  // garde — jamais le contenu, c'est le seul moyen de purger sans crasher.
  const aSupprimer = await db.sync_ops
    .orderBy("created_at")
    .reverse()
    .offset(OUTBOX_GARDE)
    .primaryKeys();
  await db.sync_ops.bulkDelete(aSupprimer);
  console.warn(`[outbox] ${aSupprimer.length} op(s) supprimée(s), démarrage dégonflé.`);
  return aSupprimer.length;
}

/** Lecture LIMITÉE de l'outbox (mission anti-crash) : le push part par petits lots
 *  (20 ops) — jamais `toArray()` complet, qui charge tout en RAM d'un coup. L'ordre
 *  de la clé (`device:seq`) suit la création par appareil : les plus anciennes
 *  sortent en premier. */
export async function listPendingOpsBatch(shopId: string, limit = 20): Promise<SyncOp[]> {
  return getDB()
    .sync_ops.where("shop_id")
    .equals(shopId)
    .filter((o) => o.status === "pending")
    .limit(limit)
    .toArray();
}
