// Tests for restitution.ts (QR-based employee→owner sales transfer)
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  addProduct,
  createSale,
  listSales,
  resetDBForTests,
  setShopAccount,
  type Sale,
  type SaleItem,
} from "@/lib/db";
import { ensureIdentity, getIdentity, resetIdentityForTests } from "@/lib/syncengine/identity";
import {
  applyClosingImport,
  buildClosingPayload,
  parseClosingPayload,
  buildRestitutionRequest,
  parseRestitutionRequest,
} from "@/lib/restitution";

const ACCOUNT = { name: "B Employeur", phone: "+24100000001", password: "secret" };

// Helper: create a minimal sale with one product line
async function makeSale(productId: string, quantity = 1, price = 1000, cost = 500): Promise<Sale> {
  const product = await addProduct({
    name: "Produit Test",
    cost,
    price,
    stock: 10,
    category: "Boisson",
  });
  return await createSale({
    lines: [
      { product_id: product.id, quantity, price, cost, category: "Boisson", name: "Produit Test" },
    ],
    cash_given: price * quantity,
  });
}

describe("restitution flow", () => {
  beforeEach(async () => {
    await resetDBForTests();
    resetIdentityForTests();
    await setShopAccount(ACCOUNT);
  });

  afterEach(async () => {
    await resetDBForTests();
    resetIdentityForTests();
  });

  it("builds and parses restitution request (owner→employee)", async () => {
    const identity = await ensureIdentity();
    const requestText = buildRestitutionRequest("Ma Boutique", identity.deviceId);
    expect(requestText).toContain('"app":"ecaisse"');
    expect(requestText).toContain('"type":"restitution"');
    const parsed = parseRestitutionRequest(requestText);
    expect(parsed).not.toBeNull();
    expect(parsed?.shop).toBe("Ma Boutique");
    expect(parsed?.device).toBe(identity.deviceId);
  });

  it("employee can aggregate sales and produce a closing QR", async () => {
    const owner = await ensureIdentity();
    // Seed two sales for the employee (same device)
    const p1 = "prod1";
    const p2 = "prod2";
    await makeSale(p1, 2, 1000, 600); // revenue 2000, profit (1000-600)*2 = 800
    await makeSale(p2, 1, 1500, 900); // revenue 1500, profit (1500-900)*1 = 600
    // Total: revenue 3500, profit 1400, sales 2, items 3

    const now = Date.now();
    const from = now - 24 * 60 * 60 * 1000; // yesterday
    const to = now + 24 * 60 * 60 * 1000; // tomorrow

    const request = buildRestitutionRequest("Boutique Proprio", owner.deviceId);
    const parsedReq = parseRestitutionRequest(request)!;
    const payloadText = JSON.stringify(
      await buildClosingPayload(parsedReq, from, to, "Employé Test", owner.deviceId),
    );
    expect(payloadText).toContain('"app":"ecaisse"');
    expect(payloadText).toContain('"type":"closure"');
    const payload = parseClosingPayload(payloadText)!;
    expect(payload).not.toBeNull();
    expect(payload.employeeName).toBe("Employé Test");
    expect(payload.employeeDevice).toBe(owner.deviceId);
    expect(payload.ownerDevice).toBe(owner.deviceId);
    expect(payload.from).toBeLessThanOrEqual(now);
    expect(payload.to).toBeGreaterThan(now);
    expect(payload.sales).toBe(2);
    expect(payload.items).toBe(3);
    expect(payload.revenue).toBe(3500);
    expect(payload.profit).toBe(1400);
    // Check categories aggregated (both Boisson)
    expect(payload.byCategory).toHaveLength(1);
    expect(payload.byCategory[0]).toEqual({
      category: "Boisson",
      revenue: 3500,
      profit: 1400,
    });
    // Check products (byProduct may be truncated under QR budget; check count only)
    expect(payload.byProduct.length).toBeGreaterThanOrEqual(1);
  });

  it("owner can import closing QR and avoid duplicates", async () => {
    const owner = await ensureIdentity();
    // Seed one sale
    await makeSale("prodX", 1, 2000, 1200); // revenue 2000, profit 800

    const now = Date.now();
    const from = now - 5000;
    const to = now + 5000;

    const request = buildRestitutionRequest("Shop Proprio", owner.deviceId);
    const parsedReq = parseRestitutionRequest(request)!;
    const payloadText = JSON.stringify(
      await buildClosingPayload(parsedReq, from, to, "Employé A", owner.deviceId),
    );
    const payload = parseClosingPayload(payloadText)!;

    // First import
    const result1 = await applyClosingImport(payload, owner.deviceId);
    expect(result1.status).toBe("imported");
    const closing1 = result1.status === "imported" ? result1.closing : null;
    expect(closing1).not.toBeNull();
    if (closing1) {
      expect(closing1.revenue).toBe(2000);
      expect(closing1.profit).toBe(800);
      expect(closing1.employeeName).toBe("Employé A");
      expect(closing1.importedAt).toBeGreaterThan(0);
    }

    // Second import of same QR → duplicate
    const result2 = await applyClosingImport(payload, owner.deviceId);
    expect(result2.status).toBe("duplicate");
    if (result2.status === "duplicate" && "closing" in result2) {
      expect(result2.closing.id).toBe(closing1?.id);
    }

    // Changing the payload (e.g. employee name) yields different id → not duplicate
    const payload2Text = JSON.stringify(
      await buildClosingPayload(
        parsedReq,
        from,
        to,
        "Employé B", // different name
        owner.deviceId,
      ),
    );
    const payload2 = parseClosingPayload(payload2Text)!;
    const result3 = await applyClosingImport(payload2, owner.deviceId);
    expect(result3.status).toBe("imported"); // not duplicate
    if (result3.status === "imported" && "closing" in result3) {
      expect(result3.closing.employeeName).toBe("Employé B");
      expect(result3.closing.id).not.toBe(closing1?.id);
    }
  });
});
