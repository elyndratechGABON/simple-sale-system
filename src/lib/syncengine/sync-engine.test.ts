// Tests du moteur de synchronisation local-first.
//
// Scénario commun : deux appareils du MÊME compte (même `accountPhone` + `accountName`,
// donc même `shopId`). L'appareil A émet des ops dans son outbox, l'appareil B — une base
// neuve — les lit et les rejoue via `applyRemoteOps`. Le transport (WebRTC, relais) n'est
// pas dans la boucle : il n'est que la copie des ops, que ces tests simulent directement.
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
  resetDBForTests,
  setShopAccount,
} from "../db";
import { applyRemoteOps } from "./apply";
import {
  ensureIdentity,
  getDeviceKeys,
  getIdentity,
  resetDeviceIdentity,
  resetIdentityForTests,
} from "./identity";
import { listPendingOps, markOpsSynced } from "./outbox";

const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };
const LINE = (productId: string) => ({
  product_id: productId,
  name: "Coca 1L",
  price: 600,
  cost: 300,
  category: "Boisson" as const,
  quantity: 2,
});

/** Réinitialise la base + le cache d'identité : simule un appareil neuf. */
async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}

describe("identité", () => {
  it("crée une identité stable par appareil (deviceId + clés RSA)", async () => {
    await ensureIdentity();
    const a = getIdentity();
    expect(a.deviceId.length).toBeGreaterThan(0);
    // Pas de compte en base → groupe isolé, rien à partager.
    expect(a.shopId.startsWith("d_")).toBe(true);

    const keys = getDeviceKeys();
    expect(JSON.parse(keys.publicKey).kty).toBe("RSA");
    expect(keys.privateKey.length).toBeGreaterThan(0);

    // Rechargement : l'identité persiste et ne change pas.
    resetIdentityForTests();
    const b = await ensureIdentity();
    expect(b.deviceId).toBe(a.deviceId);
    expect(b.shopId).toBe(a.shopId);
  });

  it("deux appareils du même compte partagent le même shopId", async () => {
    await setShopAccount(ACCOUNT);
    const idA = await ensureIdentity();
    // resetDeviceIdentity simule un second mobile.
    const idB = await resetDeviceIdentity();
    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(idA.shopId).toBe(idB.shopId);
    expect(idA.shopId.startsWith("s_")).toBe(true);
  });
});

describe("outbox", () => {
  it("émet une op par écriture et décrémente le stock local", async () => {
    const identity = await ensureIdentity();
    const product = await addProduct({
      name: "Coca 1L",
      cost: 300,
      price: 600,
      stock: 10,
      category: "Boisson",
    });

    let ops = await listPendingOps(identity.shopId);
    const created = ops.find((o) => o.type === "product.created" && o.entity_id === product.id);
    expect(created).toBeDefined();
    // Le stock ABSOLU part dans la création, jamais un delta.
    expect((created!.payload as { product: { stock: number } }).product.stock).toBe(10);

    const sale = await createSale({ lines: [LINE(product.id)], cash_given: 1200 });
    ops = await listPendingOps(identity.shopId);
    const saleOp = ops.find((o) => o.type === "sale.created" && o.entity_id === sale.id);
    expect(saleOp).toBeDefined();
    const payload = saleOp!.payload as { sale: { id: string }; items: unknown[] };
    expect(payload.sale.id).toBe(sale.id);
    expect(payload.items).toHaveLength(1);

    const stock = (await listProducts()).find((p) => p.id === product.id)!.stock;
    expect(stock).toBe(8);
  });

  it("acquitte les ops transmises", async () => {
    const identity = await ensureIdentity();
    await addProduct({
      name: "Coca 1L",
      cost: 300,
      price: 600,
      stock: 10,
      category: "Boisson",
    });
    const ops = await listPendingOps(identity.shopId);
    expect(ops.length).toBeGreaterThan(0);

    await markOpsSynced(ops.map((o) => o.id));
    const remaining = await listPendingOps(identity.shopId);
    expect(remaining).toHaveLength(0);
  });
});

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
    const sourceOps = await listPendingOps(idA.shopId);

    // ---- Appareil B : base neuve, même compte ----
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    expect(idB.shopId).toBe(idA.shopId);
    expect(idB.deviceId).not.toBe(idA.deviceId);

    const { applied, skipped } = await applyRemoteOps(sourceOps);
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
    const replay = await applyRemoteOps(sourceOps);
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
    const sourceOps = await listPendingOps(idA.shopId);
    expect(sourceOps.some((o) => o.type === "sale.cancelled")).toBe(true);

    // ---- Appareil B : rejoue tout, l'annulation suit la création ----
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    await applyRemoteOps(sourceOps);

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
    const sourceOps = await listPendingOps(idA.shopId);
    expect(
      sourceOps.some(
        (o) => o.type === "stock.adjusted" && (o.payload as { delta: number }).delta === 5,
      ),
    ).toBe(true);

    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await applyRemoteOps(sourceOps);

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
    const sourceOps = await listPendingOps(idA.shopId);

    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    expect(idB.deviceId).not.toBe(idA.deviceId);
    await applyRemoteOps(sourceOps);

    expect(await listClients()).toHaveLength(1);
    expect((await listClients())[0].id).toBe(client.id);
    expect((await listClients())[0].phone).toBe("066123456");
  });
});
