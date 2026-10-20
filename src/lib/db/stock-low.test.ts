// L'alerte stock bas franchit le seuil : un employé crie `stock.low` au passage de
// > threshold à <= threshold, exactement UNE op par franchissement — pas une babille
// d'ops à chaque vente sous le seuil. Le propriétaire ne crie pas : ses alertes, il
// les voit en direct sur son propre tableau de bord.
import { describe, it, expect } from "vitest";
import { addProduct, applyStockDelta, getDB, setShopAccount } from "../db";
import { ensureIdentity, setIdentityRole } from "../syncengine/identity";
import { listPendingOps } from "../syncengine/outbox";
import { ACCOUNT, freshDevice } from "../syncengine/transport-helpers";

describe("applyStockDelta — franchissement du seuil stock bas", () => {
  it("un employé émet stock.low au franchissement, une seule fois par passage", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const identity = await ensureIdentity();
    await setIdentityRole("employee");

    const coca = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
      min_stock: 4,
    });
    const lows = async () =>
      (await listPendingOps(identity.shopId)).filter((o) => o.type === "stock.low");

    // 10 → 8 : on approche le seuil sans le franchir. Rien à crier.
    await applyStockDelta(getDB(), coca.id, -2);
    expect(await lows()).toHaveLength(0);

    // 8 → 3 : franchissement > 4 devient <= 4. UN cri.
    await applyStockDelta(getDB(), coca.id, -5);
    expect(await lows()).toHaveLength(1);
    const pl = (await lows())[0].payload as {
      product_id: string;
      device_id: string;
      stock: number;
      threshold: number;
    };
    expect(pl.product_id).toBe(coca.id);
    expect(pl.device_id).toBe(identity.deviceId);
    expect(pl.stock).toBe(3);
    expect(pl.threshold).toBe(4);

    // 3 → 2 : on reste sous le seuil, PAS un deuxième cri pour le même passage.
    await applyStockDelta(getDB(), coca.id, -1);
    expect(await lows()).toHaveLength(1);
  });

  it("un produit sans seuil ne crie jamais", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const identity = await ensureIdentity();
    await setIdentityRole("employee");

    const eau = await addProduct({
      name: "Eau minérale",
      price: 200,
      cost: 80,
      category: "Boisson",
      stock: 10,
    });
    await applyStockDelta(getDB(), eau.id, -10);
    const lows = (await listPendingOps(identity.shopId)).filter((o) => o.type === "stock.low");
    expect(lows).toHaveLength(0);
  });

  it("le propriétaire ne crie pas : ses alertes, il les voit en direct", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const identity = await ensureIdentity(); // rôle défaut : owner

    const biere = await addProduct({
      name: "Bière",
      price: 800,
      cost: 300,
      category: "Boisson",
      stock: 10,
      min_stock: 4,
    });
    // 10 → 4 : franchissement réel, mais ce n'est pas un employé.
    await applyStockDelta(getDB(), biere.id, -6);
    const lows = (await listPendingOps(identity.shopId)).filter((o) => o.type === "stock.low");
    expect(lows).toHaveLength(0);
  });
});
