// Le périmètre de sync-data : la convergence P2P fait vivre toutes les ventes du groupe
// sur chaque écran — un employé n'exporte donc que SES encaissements, le propriétaire
// le cumul. Sans ce filtre, l'orchestrateur (qui somme les payloads par appareil)
// comptait chaque vente n fois dans la boutique du compte.
import { describe, it, expect } from "vitest";
import { addProduct, createSale, getDB, setShopAccount } from "@/lib/db";
import { ensureIdentity, setIdentityRole } from "@/lib/syncengine/identity";
import { ACCOUNT, LINE, freshDevice } from "../syncengine/transport-helpers";
import { buildLightPayload } from "./payload";

describe("buildLightPayload", () => {
  it("un employé n'exporte que ses encaissements", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();

    const coca = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });

    // Vente antérieure au traçage (historique), appartenant au propriétaire.
    await getDB().sales.put({
      id: "v-proprio",
      timestamp: Date.now(),
      total: 5000,
      cash_given: 5000,
      change_due: 0,
      day_closed: false,
      customers_count: 1,
      status: "paid",
      payment_method: "cash",
      updated_at: Date.now(),
      sync_status: "local",
    });

    // L'appareil est un employé : il encaisse une vente et n'exporte qu'elle.
    await setIdentityRole("employee");
    await createSale({ lines: [LINE(coca.id)], cash_given: 2000 });

    const payload = await buildLightPayload();
    expect(payload.totals.sales).toBe(1);
    expect(payload.totals.revenue).toBe(1200);
    expect(payload.totals.profit).toBe(600);
    expect(payload.top_products[0]?.quantity).toBe(2);
  });

  it("le propriétaire exporte le cumul — ventes sans traçage comprises", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();

    const coca = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await getDB().sales.put({
      id: "v-proprio",
      timestamp: Date.now(),
      total: 5000,
      cash_given: 5000,
      change_due: 0,
      day_closed: false,
      customers_count: 1,
      status: "paid",
      payment_method: "cash",
      updated_at: Date.now(),
      sync_status: "local",
    });
    // Une vente héritée a aussi fait sortir un produit : sa ligne figée est ce qui
    // alimente le revenu (computePeriodStats dérive le CA des lignes, pas du total).
    await getDB().sale_items.put({
      id: "vi-proprio",
      sale_id: "v-proprio",
      name: "Menu libre",
      quantity: 1,
      price_at_sale: 5000,
      cost_at_sale: 0,
      category_at_sale: "Plats",
      updated_at: Date.now(),
      sync_status: "local",
    });

    await createSale({ lines: [LINE(coca.id)], cash_given: 2000 });
    const cumul = await buildLightPayload();
    expect(cumul.totals.sales).toBe(2);
    expect(cumul.totals.revenue).toBe(6200);
  });
});
