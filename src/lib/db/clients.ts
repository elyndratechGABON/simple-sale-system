import { ensureIdentity, getIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";
import { alive, getDB, touch, uid } from "./internal";
import { clientPatch } from "./patches";
import type { Client } from "./types/records";
import type { SyncFields } from "./types/sync";

// ---------- Clients (cluster service) ----------
// Registre de fiches clients pour les salons, coiffeurs, etc. L'historique des visites
// se déduit des ventes liées via `client_id`. Pas de CRM lourd : nom, tél, anniversaire.

export async function listClients(): Promise<Client[]> {
  const all = await getDB().clients.toArray();
  return alive(all).sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchClients(query: string): Promise<Client[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listClients();
  const all = await getDB().clients.toArray();
  return alive(all).filter(
    (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)),
  );
}

export async function addClient(c: Omit<Client, "id" | keyof SyncFields>): Promise<Client> {
  await ensureIdentity();
  const client: Client = { ...c, id: uid(), ...touch() };
  const db = getDB();
  await db.transaction("rw", db.clients, db.sync_ops, db.settings, async () => {
    await db.clients.put(client);
    await emitOp(db, getIdentity(), {
      type: "client.created",
      entity_id: client.id,
      payload: { client },
    });
  });
  return client;
}

export async function updateClient(c: Client): Promise<void> {
  await ensureIdentity();
  const db = getDB();
  const previous = await db.clients.get(c.id);
  await db.transaction("rw", db.clients, db.sync_ops, db.settings, async () => {
    await db.clients.put({ ...c, ...touch() });
    const fields = clientPatch(previous, c);
    if (fields) {
      await emitOp(db, getIdentity(), {
        type: "client.updated",
        entity_id: c.id,
        payload: { client_id: c.id, fields },
      });
    }
  });
}

export async function deleteClient(id: string): Promise<void> {
  await ensureIdentity();
  const db = getDB();
  const c = await db.clients.get(id);
  if (!c) return;
  await db.transaction("rw", db.clients, db.sync_ops, db.settings, async () => {
    await db.clients.put({ ...c, ...touch(), deleted_at: Date.now() });
    await emitOp(db, getIdentity(), {
      type: "client.deleted",
      entity_id: id,
      payload: { client_id: id },
    });
  });
}

/** Nombre de visites (ventes payées) et total dépensé pour un client. */
export async function getClientStats(
  clientId: string,
): Promise<{ visits: number; totalSpent: number; lastVisit: number | null }> {
  const db = getDB();
  const sales = alive(await db.sales.where("client_id").equals(clientId).toArray()).filter(
    (s) => s.status !== "open" && !s.deleted_at,
  );
  const visits = sales.length;
  const totalSpent = sales.reduce((s, x) => s + x.total, 0);
  const lastVisit = visits > 0 ? Math.max(...sales.map((s) => s.timestamp)) : null;
  return { visits, totalSpent, lastVisit };
}
