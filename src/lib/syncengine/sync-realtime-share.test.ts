// Tests de synchronisation temps réel entre appareils d'une même boutique.
//
// Chaque scénario simule deux (ou trois) appareils via `freshDevice()` + `makeRelay()` :
// un appareil effectue une opération, pousse vers le relais, puis un autre appareil tire
// et vérifie la convergence. Le moteur est le même que transport.test.ts — les tests ici
// se concentrent sur les CAS MÉTIER de partage (produit, vente, stock).
import { describe, it, expect } from "vitest";
import {
  addProduct,
  createSale,
  getSaleItems,
  listProducts,
  listSales,
  removeStock,
  setShopAccount,
} from "../db";
import { ensureIdentity, getIdentity } from "./identity";
import { exchangeOps } from "./transport";
import { getPairingToken } from "./pairing";
import { ACCOUNT, freshDevice, joinAs, makeRelay } from "./sync-realtime-helpers";

// ─── Scénario 1 : produit créé par le propriétaire → l'employé le voit ────────
describe("sync temps réel : produit créé par le propriétaire", () => {
  it("le propriétaire crée un produit → l'employé le voit après sync", async () => {
    // Appareil A : propriétaire
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idOwner = getIdentity();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await exchangeOps(relay.client);

    // Appareil B : employé, même compte, appairé avec le CODE du propriétaire.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    expect(getIdentity().shopId).toBe(idOwner.shopId);

    const state = await exchangeOps(relay.client);
    expect(state.applied).toBeGreaterThanOrEqual(1);

    const products = await listProducts();
    const found = products.find((p) => p.id === product.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Coca 1L");
    expect(found?.stock).toBe(10);
  });
});

// ─── Scénario 2 : vente créée par l'employé → le propriétaire la voit ────────
describe("sync temps réel : vente créée par l'employé", () => {
  it("l'employé encaisse → le propriétaire voit la vente et le stock baisse", async () => {
    // Propriétaire crée le produit et sync
    await freshDevice();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Café",
      price: 200,
      cost: 60,
      category: "Chaud",
      stock: 5,
    });
    await exchangeOps(relay.client);

    // Employé reçoit le produit (appairé avec le code du propriétaire).
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);

    const localProducts = await listProducts();
    expect(localProducts.find((p) => p.id === product.id)?.stock).toBe(5);

    // Employé encaisse une vente (2 cafés)
    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Café",
          price: 200,
          cost: 60,
          category: "Boisson",
          quantity: 2,
        },
      ],
      cash_given: 400,
    });

    // Le stock descend sur l'appareil employé
    const afterSale = await listProducts();
    expect(afterSale.find((p) => p.id === product.id)?.stock).toBe(3);

    // L'employé pousse
    await exchangeOps(relay.client);

    // Le propriétaire tire
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await exchangeOps(relay.client);

    // Le propriétaire voit la vente
    const ownerSales = await listSales();
    expect(ownerSales.length).toBe(1);
    const items = await getSaleItems(ownerSales[0].id);
    expect(items).toHaveLength(1);
    expect(items[0].product_id).toBe(product.id);

    // Le stock a bien baissé chez le propriétaire aussi
    const ownerProducts = await listProducts();
    expect(ownerProducts.find((p) => p.id === product.id)?.stock).toBe(3);
  });
});

// ─── Scénario 3 : ajustement de stock par l'employé → visible partout ──────────
describe("sync temps réel : ajustement de stock par l'employé", () => {
  it("un employé ajuste le stock → le propriétaire et l'employé voient le nouveau stock", async () => {
    // Propriétaire crée le produit
    await freshDevice();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 20,
    });
    await exchangeOps(relay.client);

    // Employé reçoit le produit, ajuste le stock
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);

    const before = await listProducts();
    expect(before.find((p) => p.id === product.id)?.stock).toBe(20);

    await removeStock(product.id, 5); // -5 pains

    const afterAdjust = await listProducts();
    expect(afterAdjust.find((p) => p.id === product.id)?.stock).toBe(15);

    await exchangeOps(relay.client);

    // Le propriétaire tire
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await exchangeOps(relay.client);

    const ownerProducts = await listProducts();
    expect(ownerProducts.find((p) => p.id === product.id)?.stock).toBe(15);
  });
});
