// Push des ops locales vers le relais.

import type { SyncRepository, TransportClient, SyncIdentity, SyncOp } from "./types";
import { listPendingOps } from "../outbox";
import { signAll } from "../ops";
import { markOpsSynced } from "../outbox";

/** Pousse l'outbox locale vers le relais. Retourne le nombre d'ops poussées. */
export async function pushLocalOps(
  client: TransportClient,
  identity: SyncIdentity,
  repo: SyncRepository,
): Promise<number> {
  const pending = await listPendingOps(identity.shopId);
  if (pending.length === 0) return 0;

  const signed = await signAll(pending);
  if (await client.push(identity.shopId, signed)) {
    await markOpsSynced(pending.map((o: SyncOp) => o.id));
    return pending.length;
  }
  return 0;
}

/** Push forcé immédiat (utilisé pour les snapshots d'approbation ou demandes confirmées). */
export async function forcePushNow(
  client: TransportClient,
  shopId: string,
  signAll: (ops: SyncOp[]) => Promise<SyncOp[]>,
  listPendingOps: (shopId: string) => Promise<SyncOp[]>,
  markOpsSynced: (opIds: string[]) => Promise<void>,
): Promise<void> {
  const pendingNow = await listPendingOps(shopId);
  if (pendingNow.length === 0) return;

  const signed = await signAll(pendingNow);
  if (await client.push(shopId, signed)) {
    await markOpsSynced(pendingNow.map((o: SyncOp) => o.id));
  }
}
