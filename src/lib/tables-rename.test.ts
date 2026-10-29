// Renommage d'une table ouverte : le libellé vit sur la `Sale`, donc il suit l'addition
// jusqu'à l'encaissement et l'historique.
import { describe, it, expect } from "vitest";
import { addProduct, addRound, listOpenTables, openTable, payTable, renameTable } from "./db";
import { onAccount, PRODUCT, LINE } from "./tables-sync-helpers";

describe("renameTable", () => {
  it("enregistre le nom personnalisé sur l'addition ouverte", async () => {
    await onAccount();
    const table = await openTable("T1");

    const updated = await renameTable(table.id, "Table Client Jean");

    expect(updated.table).toBe("Client Jean");
    const [open] = await listOpenTables();
    expect(open.table).toBe("Client Jean");
  });

  it("nettoie les espaces et refuse un nom vide", async () => {
    await onAccount();
    const table = await openTable("T1");

    const updated = await renameTable(table.id, "  Table   Terrasse 2  ");
    expect(updated.table).toBe("Terrasse 2");

    await expect(renameTable(table.id, "   ")).rejects.toThrow("vide");
  });

  it("refuse de renommer une addition déjà réglée", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT);
    const table = await openTable("T1");
    await addRound(table.id, [LINE(product.id)]);
    await payTable(table.id, 2000);

    await expect(renameTable(table.id, "Client Jean")).rejects.toThrow("réglée");
  });
});
