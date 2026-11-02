// Fusion d'un instantané avec le catalogue local : le snapshot est la SOURCE DE VÉRITÉ
// ABSOLUE — un `bulkPut` écrase le catalogue porté par l'op sans comparaison d'`updated_at`
// (correctif 83172715). Un produit déjà vendu localement est donc réaligné à l'absolu du
// propriétaire, dont le comptage EST LA FOI — une correction de comptage ne voyage par
// aucune autre op. L'absence du catalogue ne supprime RIEN (cf. AGENTS.md).
import { describe, it, expect } from "vitest";
import { addProduct, createSale, listProducts, setShopAccount } from "../db";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ensureIdentity } from "./identity";
import { ACCOUNT, LINE, announceOpFor, freshDevice, makeRelay } from "./transport-helpers";

describe("transport P2P via relais", () => {
  it("le snapshot écrase même un produit déjà présent : le comptage du propriétaire fait foi", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();

    // Le pair a déjà son catalogue : un produit créé, deux unités déjà vendues.
    const product = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Pain",
          price: 100,
          cost: 40,
          category: "Boulangerie",
          quantity: 2,
        },
      ],
      cash_given: 200,
    });
    expect((await listProducts()).find((p) => p.id === product.id)?.stock).toBe(4);

    // Un instantané (pris AVANT la vente, `updated_at: 0`) arrive du principal : la
    // vérité absolue s'applique TELLE QUELLE, sans arrière-pensée de fraîcheur.
    const snapOp = await relay.asPeer({
      id: "snap:2",
      device_id: "proprietaire",
      payload: {
        products: [
          {
            id: product.id,
            name: "Pain",
            price: 100,
            cost: 40,
            category: "Boulangerie",
            stock: 6,
            updated_at: 0,
            sync_status: "local",
          },
          {
            id: "p2",
            name: "Lait",
            price: 500,
            cost: 250,
            category: "Boisson",
            stock: 3,
            updated_at: 0,
            sync_status: "local",
          },
        ],
      },
      status: "synced",
    });
    await applyRemoteOpsSigned([await announceOpFor("proprietaire"), snapOp]);

    // Le stock du pair revient à l'ABSOLU du propriétaire : 6, pas 4.
    expect((await listProducts()).find((p) => p.id === product.id)?.stock).toBe(6);
    // Le produit inconnu est bootstrappé à l'absolu.
    expect((await listProducts()).find((p) => p.id === "p2")?.stock).toBe(3);
  });

  it("tout instantané réaligne le stock, périmé ou non (aucune comparaison de fraicheur)", async () => {
    // La correction de comptage du propriétaire ne part par aucune op
    // (`updateProduct` ne propage pas le stock) — l'instantané est le SEUL canal qui
    // la porte. Le ralinement est donc INCONDITIONNEL : un instantané daté d'avant
    // notre copie réécrit quand même, sinon la caisse employé corrige son comptage
    // une seule fois dans la vie.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();

    const drink = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 4,
    });
    const shirt = await addProduct({
      name: "T-shirt",
      price: 5000,
      cost: 2000,
      category: "Vetement",
      stock: 3,
      variants: [
        { id: "v1", name: "M", stock: 2 },
        { id: "v2", name: "L", stock: 1 },
      ],
    });

    const snapshot = (id: string, stock: number, variantStock: number, updatedAt: number) =>
      relay.asPeer({
        id,
        device_id: "proprietaire",
        payload: {
          products: [
            { ...drink, stock, updated_at: updatedAt },
            {
              ...shirt,
              stock,
              updated_at: updatedAt,
              variants: [
                { id: "v1", name: "M", stock: variantStock },
                { id: "v2", name: "L", stock: variantStock },
              ],
            },
          ],
        },
        status: "synced",
      });

    // Le propriétaire republie au stock qui lui fait foi.
    await applyRemoteOpsSigned([
      await announceOpFor("proprietaire"),
      await snapshot("snap:frais", 15, 9, Date.now() + 60_000),
    ]);
    const after = await listProducts();
    expect(after.find((p) => p.id === drink.id)?.stock).toBe(15);
    expect(after.find((p) => p.id === shirt.id)?.stock).toBe(15);
    expect(after.find((p) => p.id === shirt.id)?.variants?.map((v) => v.stock)).toEqual([9, 9]);

    // Un instantané PÉRIMÉ réécrit AUSSI à l'absolu : aucune date, seule la valeur
    // portée vaut — le comptage du propriétaire écrase tout, dans les deux sens.
    await applyRemoteOpsSigned([await snapshot("snap:perime", 4, 1, Date.now() - 60_000)]);
    const stale = await listProducts();
    expect(stale.find((p) => p.id === drink.id)?.stock).toBe(4);
    expect(stale.find((p) => p.id === shirt.id)?.variants?.map((v) => v.stock)).toEqual([1, 1]);
  });
});
