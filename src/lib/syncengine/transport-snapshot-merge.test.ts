// Fusion d'un instantané avec le catalogue local : un snapshot ne ressuscite jamais du
// stock déjà vendu ici (bootstrap + deltas seuls), mais un instantané plus récent
// réaligne le stock et les variantes quand le propriétaire a corrigé un comptage.
import { describe, it, expect } from "vitest";
import { addProduct, createSale, listProducts, setShopAccount } from "../db";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ensureIdentity } from "./identity";
import { ACCOUNT, LINE, announceOpFor, freshDevice, makeRelay } from "./transport-helpers";

describe("transport P2P via relais", () => {
  it("un snapshot n'écrase jamais un produit déjà présent (bootstrap + deltas seuls)", async () => {
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

    // Un instantané STALE (pris avant la vente) + un produit inconnu arrivent du principal.
    // L'instantané vient d'un pair : son annonce d'abord, sinon sa clé n'est pas
    // connue et le snapshot serait refusé.
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

    // Le produit connu GARDE son stock (4) : la vente du pair n'est pas « ressuscitée ».
    expect((await listProducts()).find((p) => p.id === product.id)?.stock).toBe(4);
    // Le produit inconnu, lui, est bootstrappé à l'absolu.
    expect((await listProducts()).find((p) => p.id === "p2")?.stock).toBe(3);
  });

  it("un instantané plus récent réaligne le stock d'un écran qui a déjà le produit", async () => {
    // Le « transfert de stock » du propriétaire vers l'employé n'est pas qu'un bootstrap :
    // une correction de comptage faite par le propriétaire NE part par aucune op
    // (`updateProduct` ne propage pas le stock, `applyRemoteOps` n'émet rien) — l'instantané
    // est alors le SEUL canal qui la porte. Sans réalignement, la caisse employé garde le
    // stock de son dernier import pour toujours.
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

    // Le propriétaire republie au stock qui lui fait foi — écrit APRÈS notre copie.
    await applyRemoteOpsSigned([
      await announceOpFor("proprietaire"),
      await snapshot("snap:frais", 15, 9, Date.now() + 60_000),
    ]);
    const after = await listProducts();
    expect(after.find((p) => p.id === drink.id)?.stock).toBe(15);
    expect(after.find((p) => p.id === shirt.id)?.stock).toBe(15);
    expect(after.find((p) => p.id === shirt.id)?.variants?.map((v) => v.stock)).toEqual([9, 9]);

    // Un instantané PÉRIMÉ (pris avant une vente déjà comptée ici) ne ressuscite rien.
    await applyRemoteOpsSigned([await snapshot("snap:perime", 4, 1, Date.now() - 60_000)]);
    const stale = await listProducts();
    expect(stale.find((p) => p.id === drink.id)?.stock).toBe(15);
    expect(stale.find((p) => p.id === shirt.id)?.variants?.map((v) => v.stock)).toEqual([9, 9]);
  });
});
