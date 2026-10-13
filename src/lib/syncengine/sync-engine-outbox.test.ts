// Outbox local : chaque écriture émet une op, l'acquittement la retire des ops en attente.
import { describe, it, expect } from "vitest";
import { addProduct, createSale, listProducts } from "../db";
import { ensureIdentity } from "./identity";
import { listPendingOps, markOpsSynced } from "./outbox";
import { LINE } from "./sync-engine-helpers";

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
