import { getDB } from "@/lib/db";
import { blessEmployeeDevice } from "@/lib/gatekeeper";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";

/**
 * Ratissage des écrans approuvés non encore rattachés au compte côté serveur (`/account/bless`).
 * Best-effort : ne doit JAMAIS échouer la synchro.  L'appel est déclenché par la synchro
 * d'arrière-plan ET par le « synchroniser » ; il ne tourne que pour le rôle `owner` (seul le
 * propriétaire possède les identifiants du compte pour authentifier l'appel).
 */
export async function blessPendingPeers(): Promise<void> {
  try {
    const identity = await ensureIdentity();
    if (identity.role !== "owner") return;
    const peers = await listPairedDevices(identity.shopId);
    const db = getDB();
    for (const peer of peers) {
      if (peer.status !== "paired" || peer.blessed_at || !peer.server_device_id) continue;
      const res = await blessEmployeeDevice(peer.server_device_id);
      if (res.ok) await db.paired_devices.update(peer.id, { blessed_at: Date.now() });
    }
  } catch {
    /* silencieux — prochain cycle */
  }
}
