import { describe, expect, it } from "vitest";
import { addProduct, getDB, listProducts, setShopAccount } from "../db";
import { ACCOUNT, freshDevice } from "./transport-helpers";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ensureIdentity, getDeviceKeys, getIdentity } from "./identity";
import { signAll } from "./ops";
import type { SyncOp } from "./types";

describe("op product.image_updated", () => {
  it("applique l'image ciblée après le snapshot sans la supprimer du payload signé", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const identity = getIdentity();
    const product = await addProduct({
      name: "Coca 1L",
      cost: 300,
      price: 600,
      stock: 8,
      category: "Boisson",
    });
    await getDB().paired_devices.put({
      id: identity.deviceId,
      shop_id: identity.shopId,
      role: "owner",
      status: "paired",
      public_key: getDeviceKeys().publicKey,
      updated_at: Date.now(),
    });

    const image = "data:image/webp;base64,photo";
    const [signed] = await signAll([
      {
        id: `${identity.deviceId.slice(0, 8)}:999`,
        shop_id: identity.shopId,
        device_id: identity.deviceId,
        seq: 999,
        type: "product.image_updated",
        entity_id: product.id,
        payload: {
          product_id: product.id,
          image_base64: image,
          target_device_id: identity.deviceId,
        },
        created_at: Date.now(),
        status: "synced",
      } satisfies SyncOp,
    ]);

    await applyRemoteOpsSigned([signed!]);

    expect((await listProducts()).find((row) => row.id === product.id)?.photo).toBe(image);
  });
});
