// Convergence des additions de table et des tournées entre caisses du même compte.
//
// Jusqu'ici les tables ne sortaient JAMAIS de l'appareil : `payTable` et `payRound`
// encaissaient sans émettre d'op. Sur une caisse pair, le chiffre d'affaires et le stock
// d'une tournée restaient muets — deux caisses convergeaient sur le catalogue mais
// divergeaient dès qu'une table était réglée. Ces tests couvrent la propagation :
//  - `payTable` / `payRound` émettent une `sale.created`, le pair décrémente son stock au
//    rejeu (le STOCK est sorti à la commande sur l'émetteur, au paiement chez le pair) ;
//  - annuler une table encore ouverte ne propage RIEN (les pairs n'ont jamais décrémenté) ;
//  - annuler une table réglée restaure le stock des pairs ;
//  - une annulation distante est ignorée sur une journée clôturée.
import { describe, it, expect } from "vitest";
import {
  addProduct,
  addRound,
  cancelSale,
  closeDay,
  createSale,
  getSaleItems,
  listProducts,
  listSales,
  openTable,
  payRound,
  payTable,
  resetDBForTests,
  setShopAccount,
} from "./db";
import { applyRemoteOps } from "./syncengine/apply";
import { ensureIdentity, getIdentity, resetIdentityForTests } from "./syncengine/identity";
import { listPendingOps } from "./syncengine/outbox";
import type { SyncOp } from "./syncengine/types";

const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };
const CATEGORY = "Boisson" as const;
const PRODUCT = { name: "Coca 1L", price: 600, cost: 300, stock: 10, category: CATEGORY };
const LINE = (productId: string, quantity = 2) => ({
  product_id: productId,
  name: "Coca 1L",
  price: 600,
  cost: 300,
  category: CATEGORY,
  quantity,
});
const FREE_LINE = { name: "Coiffure", price: 500, cost: 100, category: CATEGORY, quantity: 2 };

/** Caisse neuve du compte : même shopId que les autres appareils. */
async function onAccount(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
  await setShopAccount(ACCOUNT);
  await ensureIdentity();
}

const stockOf = async (productId: string): Promise<number> =>
  (await listProducts()).find((p) => p.id === productId)?.stock ?? 0;

describe("tables & tournées : propagation entre caisses", () => {
  it("payTable propage la table réglée et fait converger le stock des pairs", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT);
    const table = await openTable("T1");
    await addRound(table.id, [LINE(product.id)]);

    // Ouverte, la table ne compte pas en chiffre d'affaires.
    expect((await listSales()).length).toBe(0);

    const settled = await payTable(table.id, 1200);
    expect(settled.id).toBe(table.id);
    expect(settled.status).toBe("paid");

    const created = (await listPendingOps(getIdentity().shopId)).filter(
      (o) => o.type === "sale.created" && o.entity_id === table.id,
    );
    expect(created.length).toBe(1);
    const payload = created[0].payload as {
      sale: { id: string };
      items: Array<{ quantity: number }>;
    };
    expect(payload.sale.id).toBe(table.id);
    expect(payload.items).toHaveLength(1);

    // Sur l'émetteur, le stock est sorti à la commande (avant l'encaissement).
    expect(await stockOf(product.id)).toBe(8);

    // Le pair rejoue les ops (product.created puis sale.created) et converge.
    const ops = await listPendingOps(getIdentity().shopId);
    await onAccount();
    const { applied } = await applyRemoteOps(ops);
    expect(applied).toBeGreaterThan(0);
    expect((await listSales()).length).toBe(1);
    expect((await listSales())[0].id).toBe(table.id);
    expect(await stockOf(product.id)).toBe(8);
  });

  it("payRound propage chaque tournée encaissée et laisse la table ouverte", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT);
    const table = await openTable("T2");
    await addRound(table.id, [LINE(product.id)]);

    const orderedAt = (await getSaleItems(table.id))[0]?.ordered_at;
    expect(orderedAt).toBeDefined();
    const settled = await payRound(table.id, orderedAt as number, 1200);
    expect(settled.id).not.toBe(table.id);
    expect((await listSales()).length).toBe(1); // la tournée seule est du CA

    // La table reste ouverte, vide : une seconde tournée peut s'y ajouter.
    await addRound(table.id, [LINE(product.id)]);
    const orderedAt2 = (await getSaleItems(table.id))[0]?.ordered_at;
    expect(orderedAt2).toBeDefined();
    await payRound(table.id, orderedAt2 as number, 1200);
    expect((await listSales()).length).toBe(2);

    // Le pair rejoue : les deux tournées arrivent, le stock converge (10 - 2 - 2).
    const ops = await listPendingOps(getIdentity().shopId);
    await onAccount();
    await applyRemoteOps(ops);
    expect((await listSales()).length).toBe(2);
    expect(await stockOf(product.id)).toBe(6);
  });

  it("annuler une table encore OUVERTE ne propage rien (pas de restauration fantôme)", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT);
    const table = await openTable("T3");
    await addRound(table.id, [LINE(product.id)]);

    await cancelSale(table.id);

    const ops = await listPendingOps(getIdentity().shopId);
    expect(ops.filter((o) => o.type === "sale.cancelled")).toHaveLength(0);
    expect(await stockOf(product.id)).toBe(10); // restauration locale, uniquement
  });

  it("annuler une table réglée restaure le stock du pair", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT);
    const table = await openTable("T4");
    await addRound(table.id, [LINE(product.id)]);
    await payTable(table.id, 1200);

    // Caisse B : applique la vente, puis en propage l'annulation.
    const opsA = await listPendingOps(getIdentity().shopId);
    await onAccount();
    await applyRemoteOps(opsA);
    expect((await listSales()).length).toBe(1);
    expect(await stockOf(product.id)).toBe(8);

    await cancelSale((await listSales())[0].id);
    const cancelled = (await listPendingOps(getIdentity().shopId)).filter(
      (o) => o.type === "sale.cancelled",
    );
    expect(cancelled.length).toBe(1);

    // Caisse C : rejoue création + annulation → vente disparue, stock revenu à 10.
    await onAccount();
    await applyRemoteOps([...opsA, cancelled[0]]);
    expect((await listSales()).length).toBe(0);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("createSale refuse un encaissement inférieur au total", async () => {
    await onAccount();
    await expect(createSale({ lines: [FREE_LINE], cash_given: 100 })).rejects.toThrow(
      "Montant insuffisant.",
    );
    // Un montant exact passe et calcule un rendu nul.
    const sale = await createSale({ lines: [FREE_LINE], cash_given: 1000 });
    expect(sale.change_due).toBe(0);
  });

  it("une annulation distante est ignorée sur une journée clôturée", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT);
    const sale = await createSale({ lines: [LINE(product.id)], cash_given: 1200 });
    await closeDay(); // verrouille la journée : la vente du jour est clôturée

    const op: SyncOp = {
      id: "device-x:1",
      shop_id: getIdentity().shopId,
      device_id: "device-x",
      seq: 1,
      created_at: Date.now(),
      type: "sale.cancelled",
      entity_id: sale.id,
      payload: { sale_id: sale.id },
      status: "pending",
    };
    const { applied } = await applyRemoteOps([op]);
    expect(applied).toBe(1); // l'op est consumée (idempotence), sans effet métier

    expect((await listSales()).length).toBe(1); // la vente reste
    expect(await stockOf(product.id)).toBe(8); // stock non restauré
  });
});
