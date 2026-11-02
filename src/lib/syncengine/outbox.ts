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

/** Acquitte des ops localement : la transmission d'un pair est confirmée — soit le patron
 *  était online au push (scénario 1), soit un op `sent` du scénario 2 vient de recevoir
 *  son ACK (le patron est revenu tirer). */
export async function markOpsSynced(ids: string[]): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.sync_ops, async () => {
    for (const id of ids) {
      const op = await db.sync_ops.get(id);
      if (op && op.status !== "synced") {
        await db.sync_ops.put({ ...op, status: "synced" });
      }
    }
  });
}

/** SCÉNARIO 2 — le patron est NOT online : l'op part quand même au relais (relais
 *  temporaire), mais la copie LOCALE reste dans l'outbox en `sent`. Elle n'est ni
 *  appliquée ni perdue : l'ACK du patron (quand il reviendra tirer) la fera passer
 *  `synced`, et le TTL rattrapage (7 jours) la refera rebasculer `pending` le cas échéant. */
export async function markOpsSent(ids: string[]): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.sync_ops, async () => {
    for (const id of ids) {
      const op = await db.sync_ops.get(id);
      if (op && op.status === "pending") {
        await db.sync_ops.put({ ...op, status: "sent", sent_at: Date.now() });
      }
    }
  });
}

/** Toutes les copies `sent` d'un compte — l'op est au relais mais PAS acquittée. */
export async function listSentOps(shopId: string): Promise<SyncOp[]> {
  return getDB()
    .sync_ops.where("shop_id")
    .equals(shopId)
    .filter((o) => o.status === "sent")
    .toArray();
}

/** SCÉNARIO 4 — LE RETOUR DU PATRON : dès qu'il est `online` au relais, les copies
 *  `sent` (envoyées, jamais acquittées) rebasculent `pending`. Le drain de CE cycle
 *  les repousse immédiatement et, le patron étant devant la caisse, les acquitte
 *  (`synced`) — l'attente ne s'éternise pas en `sent`. */
export async function rebateSentOps(shopId: string): Promise<number> {
  return rebasculer(shopId, () => true);
}

/** SCÉNARIO 3 — LE RELAIS COUPE LE FIL : au-delà de `olderThanMs` (7 j, le TTL du
 *  relais), les copies `sent` sans ACK repassent `pending`. Les docs expirées ont été
 *  supprimées par le relais : le prochain drain re-pousse le puzzle entier et rien
 *  n'est perdu — tant qu'il n'y a PAS d'ACK, la vente reste dans l'outbox locale. */
export async function downgradeStaleSentOps(shopId: string, olderThanMs: number): Promise<number> {
  const cutoff = Date.now() - olderThanMs;
  return rebasculer(shopId, (o) => (o.sent_at ?? o.created_at) < cutoff);
}

/** Le corps commun des deux scénarios : sélection par prédicat, rebasage
 *  `sent → pending` (on efface `sent_at` — l'horodatage retrouvera son sens au
 *  prochain départ), comptage pour les tests. */
async function rebasculer(shopId: string, garder: (op: SyncOp) => boolean): Promise<number> {
  const db = getDB();
  const sent = await listSentOps(shopId);
  const cibles = sent.filter(garder);
  if (cibles.length === 0) return 0;
  await db.transaction("rw", db.sync_ops, async () => {
    for (const op of cibles) {
      const row = await db.sync_ops.get(op.id);
      if (row && row.status === "sent") {
        await db.sync_ops.put({ ...row, status: "pending", sent_at: undefined });
      }
    }
  });
  return cibles.length;
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
