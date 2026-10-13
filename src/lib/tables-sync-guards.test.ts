// Gardes d'encaissement et d'annulation : un montant insuffisant est refusé, et une
// annulation distante visant une journée clôturée est ignorée (la garde métier prime sur
// l'op reçue).
import { describe, it, expect } from "vitest";
import { addProduct, closeDay, createSale, listSales } from "./db";
import { announceOpFor, applyRemoteOpsSigned } from "./syncengine/__tests__/setup";
import { signAll } from "./syncengine/ops";
import { getIdentity } from "./syncengine/identity";
import type { SyncOp } from "./syncengine/types";
import { FREE_LINE, LINE, PRODUCT, onAccount, stockOf } from "./tables-sync-helpers";

describe("tables & tournées : gardes d'encaissement", () => {
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

    // L'annulation vient d'un PAIR : elle doit être signée par une clé qu'on connaît,
    // sinon elle serait refusée en amont de la garde métier testée ici. L'annonce du
    // pair installe cette clé (groupe encore vide → premier contact).
    const [op] = await signAll([
      {
        id: "device-x:1",
        shop_id: getIdentity().shopId,
        device_id: "device-x",
        seq: 1,
        created_at: Date.now(),
        type: "sale.cancelled",
        entity_id: sale.id,
        payload: { sale_id: sale.id },
        status: "pending",
      } as SyncOp,
    ]);
    const { applied } = await applyRemoteOpsSigned([await announceOpFor("device-x"), op]);
    expect(applied).toBe(2); // l'annonce + l'annulation, cette dernière sans effet métier

    expect((await listSales()).length).toBe(1); // la vente reste
    expect(await stockOf(product.id)).toBe(8); // stock non restauré
  });
});
