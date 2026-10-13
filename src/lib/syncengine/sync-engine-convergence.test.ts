// Convergence entre deux appareils du MÊME compte (même `shopId`).
//
// L'appareil A émet des ops dans son outbox, l'appareil B — une base neuve — les lit et
// les rejoue via `applyRemoteOps`. Le transport (WebRTC, relais) n'est pas dans la
// boucle : il n'est que la copie des ops, que ces tests simulent directement.
import { describe, it, expect } from "vitest";
import {
  addClient,
  addProduct,
  addStock,
  cancelSale,
  createSale,
  getSaleItems,
  listClients,
  listProducts,
  listSales,
  setShopAccount,
} from "../db";
import { applyRemoteOpsSigned, captureSigned } from "./__tests__/setup";
import { ensureIdentity } from "./identity";
import { ACCOUNT, LINE, freshDevice } from "./sync-engine-helpers";

describe("convergence entre deux appareils du même compte", () => {
  it("rejoue création + vente et aboutit aux mêmes ventes et au même stock", async () => {
    // ---- Appareil A : le compte, le catalogue, la vente ----
    await setShopAccount(ACCOUNT);
    const idA = await ensureIdentity();
    const product = await addProduct({
      name: "Coca 1L",
      cost: 300,
      price: 600,
      stock: 10,
      category: "Boisson",
    });
    const sale = await createSale({ lines: [LINE(product.id)], cash_given: 1200 });
    const sourceOps = await captureSigned();

    // ---- Appareil B : base neuve, même compte ----
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    expect(idB.shopId).toBe(idA.shopId);
    expect(idB.deviceId).not.toBe(idA.deviceId);

    const { applied, skipped } = await applyRemoteOpsSigned(sourceOps);
    expect(applied).toBeGreaterThan(0);
    expect(skipped).toBe(0);

    const products = await listProducts();
    expect(products).toHaveLength(1);
    expect(products[0].stock).toBe(8); // 10 - 2, comme chez A

    const sales = await listSales();
    expect(sales).toHaveLength(1);
    expect(sales[0].id).toBe(sale.id);
    expect(sales[0].total).toBe(1200);

    const items = await getSaleItems(sale.id);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);

    // Idempotence : rejouer la même liste ne change RIEN.
    const replay = await applyRemoteOpsSigned(sourceOps);
    expect(replay.applied).toBe(0);
    expect(replay.skipped).toBe(sourceOps.length);
    expect((await listProducts())[0].stock).toBe(8);
  });

  it("rejoue une création puis une annulation, stock et historique cohérents", async () => {
    // ---- Appareil A ----
    await setShopAccount(ACCOUNT);
    const idA = await ensureIdentity();
    const product = await addProduct({
      name: "Coca 1L",
      cost: 300,
      price: 600,
      stock: 10,
      category: "Boisson",
    });
    const sale = await createSale({ lines: [LINE(product.id)], cash_given: 1200 });
    await cancelSale(sale.id); // chez A : 10 - 2 puis +2 → 10
    const sourceOps = await captureSigned();
    expect(sourceOps.some((o) => o.type === "sale.cancelled")).toBe(true);

    // ---- Appareil B : rejoue tout, l'annulation suit la création ----
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    await applyRemoteOpsSigned(sourceOps);

    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(await listProducts()).toHaveLength(1);
    expect((await listProducts())[0].stock).toBe(10); // création 10, vente -2, annulation +2
    expect(await listSales()).toHaveLength(0); // la vente annulée sort de l'historique
    expect(await getSaleItems(sale.id)).toHaveLength(0);
  });

  it("propage les deltas de réapprovisionnement entre appareils", async () => {
    await setShopAccount(ACCOUNT);
    const idA = await ensureIdentity();
    const product = await addProduct({
      name: "Coca 1L",
      cost: 300,
      price: 600,
      stock: 10,
      category: "Boisson",
    });
    await addStock(product.id, 5, { unit_cost: 290 });
    const sourceOps = await captureSigned();
    expect(
      sourceOps.some(
        (o) => o.type === "stock.adjusted" && (o.payload as { delta: number }).delta === 5,
      ),
    ).toBe(true);

    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await applyRemoteOpsSigned(sourceOps);

    const p = (await listProducts())[0];
    expect(p.stock).toBe(15); // 10 + delta 5
    expect(p.cost).toBe(290); // le coût renseigné au réappro a été propagé
  });

  it("propage les fiches clients", async () => {
    await setShopAccount(ACCOUNT);
    const idA = await ensureIdentity();
    const client = await addClient({
      name: "Marie",
      phone: "066123456",
      notes: "Allergique",
    });
    const sourceOps = await captureSigned();

    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    expect(idB.deviceId).not.toBe(idA.deviceId);
    await applyRemoteOpsSigned(sourceOps);

    expect(await listClients()).toHaveLength(1);
    expect((await listClients())[0].id).toBe(client.id);
    expect((await listClients())[0].phone).toBe("066123456");
  });
});
