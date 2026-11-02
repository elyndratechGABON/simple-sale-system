// Sync INVERSE employé → propriétaire : le produit créé par un employé arrive chez le
// patron, une retouche de prix employé se répercute chez lui, et un conflit d'id livre
// le produit entrant sous un nom distinct — personne ne perd sa fiche.
import { describe, it, expect } from "vitest";
import { addProduct, getDB, listProducts, setShopAccount } from "../db";
import { ensureIdentity } from "./identity";
import { signAll } from "./ops";
import { applyRemoteOpsSigned, announceOpFor } from "./__tests__/setup";
import type { SyncOp } from "./types";
import { ACCOUNT, freshDevice } from "./transport-helpers";

let seqEmp = 0;

/** Une op forgée « par l'employé » (autre device_id) : le patron la reçoit du relais
 *  telle quelle. La clé est celle épinglée par l'annonce du pair — seul signataire
 *  démontrable dans un process de test unique. */
async function opEmploye(over: Partial<SyncOp>): Promise<SyncOp> {
  const identity = await ensureIdentity();
  seqEmp += 1;
  const base: SyncOp = {
    id: `emp:${seqEmp}`,
    shop_id: identity.shopId,
    device_id: "employe",
    seq: seqEmp,
    type: "product.created",
    entity_id: "e1",
    payload: { products: [] },
    created_at: Date.now(),
    status: "pending",
    ...over,
  };
  const [signed] = await signAll([base]);
  return signed;
}

describe("sync inverse employé → propriétaire", () => {
  it("un produit créé par l'employé arrive chez le propriétaire, jamais privé", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();

    const produit = {
      id: "emp_prod_1",
      name: "Huile de palme 2L",
      cost: 2000,
      price: 3500,
      stock: 7,
      category: "Epicerie",
      updated_at: Date.now(),
      sync_status: "local" as const,
    };
    // Le payload FORGE `is_private: true` — un employé ne peut pas créer de produit
    // privé : le récepteur doit le retirer défensivement.
    await applyRemoteOpsSigned([
      await announceOpFor("employe"),
      await opEmploye({
        entity_id: produit.id,
        payload: {
          product: { ...produit, is_private: true } as unknown as Record<string, unknown>,
        },
      }),
    ]);

    const recu = (await listProducts()).find((p) => p.id === "emp_prod_1");
    expect(recu).toBeDefined();
    expect(recu?.name).toBe("Huile de palme 2L");
    expect(recu?.stock).toBe(7);
    expect(recu?.price).toBe(3500);
    expect(recu?.is_private).toBeUndefined();
  });

  it("une retouche de prix faite par l'employé met à jour la fiche du propriétaire", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const produit = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });

    await applyRemoteOpsSigned([
      await announceOpFor("employe"),
      await opEmploye({
        type: "product.updated",
        entity_id: produit.id,
        payload: { product_id: produit.id, fields: { price: 750, updated_at: Date.now() } },
      }),
    ]);

    const maj = (await listProducts()).find((p) => p.id === produit.id);
    expect(maj?.price).toBe(750);
    // Le restant de la fiche ne bouge pas : seuls les champs portés changent.
    expect(maj?.name).toBe("Coca 1L");
    expect(maj?.stock).toBe(10);
  });

  it("un conflit d'id livre le produit entrant sous un nom distinct, le local intact", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const local = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    // Le pair est nommé au registre : c'est SON nom qui détaille le doublon.
    // L'annonce est appliquée D'ABORD (elle écrit la fiche du pair), puis le nom.
    await applyRemoteOpsSigned([await announceOpFor("employe")]);
    await getDB().paired_devices.update("employe", { device_name: "Jean-Yves" });

    await applyRemoteOpsSigned([
      await opEmploye({
        entity_id: local.id,
        payload: {
          product: {
            id: local.id,
            name: "Pain",
            price: 120,
            cost: 60,
            category: "Boulangerie",
            stock: 5,
            updated_at: Date.now(),
            sync_status: "local",
          },
        },
      }),
    ]);

    const catalogue = await listProducts();
    // Le produit du PROPRIÉTAIRE reste intégralement le sien.
    const original = catalogue.find((p) => p.id === local.id);
    expect(original?.name).toBe("Pain");
    expect(original?.price).toBe(100);
    expect(original?.stock).toBe(6);
    // L'entrant du DEUXIÈME écran arrive avec une clé et un nom à lui.
    const concurrence = catalogue.find((p) => p.id !== local.id);
    expect(concurrence?.name).toBe("Pain (Jean-Yves)");
    expect(concurrence?.price).toBe(120);
  });
});
