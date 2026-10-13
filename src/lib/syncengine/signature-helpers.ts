// Helpers partagés par les tests de signature (authenticité des ops + annonces de paire).
import { getDB } from "../db";
import { ensureIdentity, signOp } from "./identity";
import type { SyncOp } from "./types";

/** Une op d'appareil A, signée, adressée à un groupe `s_` quelconque. */
export async function opFromA(over: Partial<SyncOp> = {}): Promise<SyncOp> {
  const a = await ensureIdentity();
  return signOp({
    id: "aaaa:1",
    shop_id: "s_group",
    device_id: a.deviceId,
    seq: 1,
    type: "product.created",
    entity_id: "p1",
    payload: { product: { id: "p1", name: "Produit", stock: 5, price: 100 } },
    created_at: 1,
    status: "pending",
    ...over,
  });
}

/** Fiche pairée avec la clé de l'appareil A : c'est elle qui rend A de confiance. */
export async function trustDeviceA(): Promise<void> {
  const a = await ensureIdentity();
  const jwk = JSON.parse(
    (await getDB().settings.get("syncengine_public_key_jwk"))!.value as string,
  ) as JsonWebKey;
  await getDB().paired_devices.put({
    id: a.deviceId,
    shop_id: "s_group",
    role: "owner",
    public_key: JSON.stringify(jwk),
    status: "paired",
    updated_at: Date.now(),
  });
}
