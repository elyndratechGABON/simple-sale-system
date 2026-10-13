import { signAll } from "@/lib/syncengine/ops";
import { getDeviceKeys } from "@/lib/syncengine/identity";
import type { SyncOp } from "@/lib/syncengine/types";

/** Signe des ops brutes comme le ferait un appareil émetteur. */
export async function sign(ops: SyncOp[]): Promise<SyncOp[]> {
  return signAll(ops.map((o) => ({ ...o, status: "pending" as const })));
}

/**
 * Annonce d'appareil signée : c'est elle qui installe une clé publique dans le
 * registre local. Sans elle, `resolveTrustedKeys` n'a rien contre quoi vérifier et
 * refuse TOUTES les ops — donc une restauration sans annonce ne peut rien reconstruire.
 */
export async function announceSigned(deviceId: string, shopId: string): Promise<SyncOp> {
  const [op] = await sign([
    {
      id: `annonce:${deviceId}:1`,
      shop_id: shopId,
      device_id: deviceId,
      seq: 1,
      type: "device.announce",
      entity_id: deviceId,
      payload: {
        device_id: deviceId,
        public_key: getDeviceKeys().publicKey,
        employee_name: "Appareil d'archive",
        role: "owner",
      },
      created_at: Date.now(),
      status: "pending",
    } as SyncOp,
  ]);
  return op;
}

/**
 * Op d'archive pour CE groupe. Le `shop_id` doit être celui de l'appareil courant :
 * `applyRemoteOps` ne retient que les ops du groupe courant, une archiveconstruite avec
 * un `shop_id` inventé serait ignorée — silencieusement, ce qui est exactement le piège
 * qu'un test de restauration doit attraper.
 */
export const archived = (
  identity: { shopId: string; deviceId: string },
  id: string,
  type: SyncOp["type"],
  entityId: string,
  payload: unknown,
  createdAt: number,
): SyncOp =>
  ({
    id,
    shop_id: identity.shopId,
    device_id: identity.deviceId,
    seq: Number(id.split(":").pop()) || 1,
    type,
    entity_id: entityId,
    payload,
    created_at: createdAt,
    status: "pending",
  }) as SyncOp;

export const product = (identity: { shopId: string; deviceId: string }, id: string, name: string) =>
  archived(
    identity,
    `${id}:2`,
    "product.created",
    id,
    {
      product: {
        id,
        name,
        cost: 1500,
        price: 3000,
        stock: 50,
        category: "Mobilier",
        updated_at: 1,
        sync_status: "local",
      },
    },
    1000,
  );
