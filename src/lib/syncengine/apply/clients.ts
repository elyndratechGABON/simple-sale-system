import type { PosDatabase } from "../../db";
import type { ClientCreatedPayload, ClientUpdatedPayload, SyncOp } from "../types";
import { touch } from "./helpers";

export async function applyClientCreated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ClientCreatedPayload;
  if (!pl?.client?.id) return;
  const existing = await db.clients.get(pl.client.id);
  if (existing?.deleted_at) return;
  await db.clients.put(pl.client);
}

export async function applyClientUpdated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as ClientUpdatedPayload;
  if (!pl?.client_id) return;
  const existing = await db.clients.get(pl.client_id);
  if (!existing || existing.deleted_at) return;
  await db.clients.put({ ...existing, ...pl.fields, ...touch() });
}

export async function applyClientDeleted(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as { client_id: string };
  if (!pl?.client_id) return;
  const existing = await db.clients.get(pl.client_id);
  if (!existing || existing.deleted_at) return;
  await db.clients.put({ ...existing, ...touch(), deleted_at: Date.now() });
}
