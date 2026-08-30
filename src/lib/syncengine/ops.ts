// Émission d'opérations dans le journal local.
//
// Le contrat d'atomicité : l'op et la modification métier qu'elle décrit sont écrites
// dans la MÊME transaction Dexie. Une vente enregistrée sans son op (ou une op sans sa
// vente) corromprait silencieusement la convergence. `emitOp` doit donc être appelé DANS
// le callback d'un `db.transaction("rw", ...)` qui porte déjà les stores concernés —
// `db.sync_ops` et `db.settings` compris.
//
// La séquence (`seq`) est un compteur monotone PAR APPAREIL, persévéré dans `settings`
// en dehors du journal (cf. `SEQUENCE_KEY`). Limite connue : deux onglets du même mobile
// qui écriraient simultanément liraient le même compteur et produiraient un id dupliqué.
// Pour un appareil ouvrant une seule caisse à la fois, le risque est nul.
import type { PosDatabase } from "../db";
import type { OpType, SyncIdentity, SyncOp } from "./types";
import { SEQUENCE_KEY } from "./types";

export function shortDeviceId(deviceId: string): string {
  return deviceId.replace(/-/g, "").slice(0, 8);
}

export async function emitOp(
  db: PosDatabase,
  identity: SyncIdentity,
  input: { type: OpType; entity_id: string; payload: unknown; created_at?: number },
): Promise<SyncOp> {
  const prev = (await db.settings.get(SEQUENCE_KEY))?.value;
  const seq = (typeof prev === "number" ? prev : 0) + 1;
  await db.settings.put({ key: SEQUENCE_KEY, value: seq });
  const op: SyncOp = {
    id: `${shortDeviceId(identity.deviceId)}:${seq}`,
    shop_id: identity.shopId,
    device_id: identity.deviceId,
    seq,
    type: input.type,
    entity_id: input.entity_id,
    payload: input.payload,
    created_at: input.created_at ?? Date.now(),
    status: "pending",
  };
  await db.sync_ops.put(op);
  return op;
}
