// La recharge à distance : le propriétaire émet un `stock.adjusted` ciblé
// (`target_device_id`). Seul l'écran visé enrichit son stock et journalise le
// mouvement ; les autres ignores l'op — même modèle que `catalogue.snapshot` et son
// `target_device_id`. La base de test étant unique, les écrans sont simulés
// successivement : l'identité de l'écran visé est reconstruite après chaque
// `freshDevice` (deviceId stable simulé grâce au cache d'identité).
import { describe, it, expect } from "vitest";
import {
  addProduct,
  listProducts,
  listStockMovements,
  resetDBForTests,
  setShopAccount,
} from "../db";
import { getDeviceKeys, ensureIdentity, resetIdentityForTests } from "./identity";
import { setCachedIdentity, setCachedKeys } from "./identity/state";
import { applyRemoteOpsSigned, captureSigned } from "./__tests__/setup";
import { sendRecharge } from "../db/stock";
import { ACCOUNT, freshDevice } from "./sync-engine-helpers";

describe("recharge à distance — stock.adjusted ciblé", () => {
  it("n'enrichit que l'écran visé, avec un mouvement journalisé ; les autres ignorent", async () => {
    // —— Écran visé : son deviceId doit exister AVANT l'émission de la recharge ——
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    const keysB = getDeviceKeys();

    // —— Propriétaire : catalogue + recharge vers B, UNES capture signée ——
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const product = await addProduct({
      name: "Coca 1L",
      cost: 300,
      price: 600,
      stock: 10,
      category: "Boisson",
    });
    await sendRecharge(product.id, idB.deviceId, 5);
    const ownerOps = await captureSigned();
    expect(
      ownerOps.some(
        (o) =>
          o.type === "stock.adjusted" &&
          (o.payload as { target_device_id?: string }).target_device_id === idB.deviceId,
      ),
    ).toBe(true);

    // —— B, visé : applique tout → stock 15, mouvement « Recharge à distance » ——
    await resetDBForTests();
    resetIdentityForTests();
    setCachedIdentity(idB);
    setCachedKeys(keysB);
    const { applied } = await applyRemoteOpsSigned(ownerOps);
    expect(applied).toBeGreaterThan(0);
    expect((await listProducts())[0].stock).toBe(15); // catalogue 10 + recharge 5
    const movements = await listStockMovements();
    expect(movements).toHaveLength(1);
    expect(movements[0].delta).toBe(5);
    expect(movements[0].reason).toBe("replenishment");
    expect(movements[0].note).toBe("Recharge à distance");

    // —— Un TROISIÈME écran, NON visé : catalogue appliqué, recharge ignorée ——
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idC = await ensureIdentity();
    void idC;
    await applyRemoteOpsSigned(ownerOps);
    expect((await listProducts())[0].stock).toBe(10); // la recharge ciblée ne passe pas
    expect(await listStockMovements()).toHaveLength(0);
  });
});
