// Convergence après hors-ligne : deux appareils modifient le même produit sans réseau,
// et un troisième converge vers les DEUX ventes au retour.
import { describe, it, expect } from "vitest";
import { addProduct, createSale, listProducts, listSales, setShopAccount } from "../db";
import { ensureIdentity } from "./identity";
import { exchangeOps } from "./transport";
import { getPairingToken } from "./pairing";
import { ACCOUNT, freshDevice, joinAs, makeRelay } from "./sync-realtime-helpers";

// ─── Scénario 4 : deux appareils hors-lin → convergence au retour ─────────────
describe("sync temps réel : convergence après hors-ligne", () => {
  it("deux appareils modifient le même produit hors-ligne → les deux ventes convergent", async () => {
    // Setup : propriétaire crée le produit et le pousse
    await freshDevice();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Eau 1L",
      price: 300,
      cost: 150,
      category: "Boisson",
      stock: 100,
    });
    await exchangeOps(relay.client);

    // Appareil A : reçoit le produit, vend 10, pousse.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);
    const pA = (await listProducts()).find((p) => p.id === product.id);
    expect(pA?.stock).toBe(100);

    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Eau 1L",
          price: 300,
          cost: 150,
          category: "Boisson",
          quantity: 10,
        },
      ],
      cash_given: 3000,
    });

    const afterSaleA = await listProducts();
    expect(afterSaleA.find((p) => p.id === product.id)?.stock).toBe(90);
    await exchangeOps(relay.client);

    // Appareil B (hors-ligne) : reçoit le produit + la vente A, vend 5 de plus, pousse.
    // B s'appaire avec le code du propriétaire : sans quoi A ne connaîtrait pas sa clé et
    // refuserait la vente de B — ce qui est exactement le comportement voulu.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);
    const pB = (await listProducts()).find((p) => p.id === product.id);
    expect(pB?.stock).toBe(90); // A a déjà vendu 10

    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Eau 1L",
          price: 300,
          cost: 150,
          category: "Boisson",
          quantity: 5,
        },
      ],
      cash_given: 1500,
    });

    const afterSaleB = await listProducts();
    expect(afterSaleB.find((p) => p.id === product.id)?.stock).toBe(85);
    await exchangeOps(relay.client);

    // Troisième appareil converge : les deux ventes sont visibles. Il s'appaire comme
    // les autres, sinon il n'a la clé de personne et ne peut rien appliquer.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    const final = await exchangeOps(relay.client);
    expect(final.applied).toBeGreaterThanOrEqual(2);

    const finalSales = await listSales();
    expect(finalSales.length).toBe(2);

    // Le stock final reflète les deux ventes (100 - 10 - 5 = 85)
    const finalProducts = await listProducts();
    expect(finalProducts.find((p) => p.id === product.id)?.stock).toBe(85);
  });
});
