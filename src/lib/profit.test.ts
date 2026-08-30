// Tests du calculateur de bénéfice mensuel (src/lib/profit.ts) — fonctions pures,
// recalculables à la main, comme le reste des agrégations de l'application.
import { describe, it, expect } from "vitest";
import type { Product, SaleItem } from "./db";
import {
  computeMonthlyResult,
  estimateStockValue,
  monthKey,
  monthLabel,
  monthRange,
  monthlyCostOfGoods,
  nextMonthKey,
  previousMonthKey,
  resultStatus,
} from "./profit";

const prod = (over: Partial<Product> & { id: string }): Product => ({
  name: over.id,
  cost: 0,
  price: 0,
  stock: Number.POSITIVE_INFINITY,
  category: "Boisson",
  updated_at: 0,
  sync_status: "local",
  ...over,
});

const item = (over: Partial<SaleItem> & { id: string; price_at_sale: number }): SaleItem => ({
  sale_id: "s",
  name: over.id,
  quantity: 1,
  cost_at_sale: 0,
  updated_at: 0,
  sync_status: "local",
  ...over,
});

describe("monthKey / monthRange", () => {
  it("formate la clé du mois local", () => {
    expect(monthKey(new Date(2026, 7, 15))).toBe("2026-08");
  });

  it("borne le mois en heure locale", () => {
    const { from, to } = monthRange("2026-08");
    expect(new Date(from).getFullYear()).toBe(2026);
    expect(new Date(from).getMonth()).toBe(7);
    expect(new Date(to).getFullYear()).toBe(2026);
    expect(new Date(to).getMonth()).toBe(8);
  });

  it("enchaîne les mois précédents/suivants en traversant l'année", () => {
    expect(previousMonthKey("2026-01")).toBe("2025-12");
    expect(nextMonthKey("2025-12")).toBe("2026-01");
  });

  it("donne un libellé lisible", () => {
    expect(monthLabel("2026-08").toLowerCase()).toContain("août");
    expect(monthLabel("2026-08").toLowerCase()).toContain("2026");
  });
});

describe("estimateStockValue", () => {
  it("additionne stock × coût des produits consommables", () => {
    const products = [
      prod({ id: "a", cost: 100, stock: 3 }),
      prod({ id: "b", cost: 50, stock: 10 }),
    ];
    expect(estimateStockValue(products)).toEqual({ value: 800, known: 2, total: 2 });
  });

  it("exclut services, actifs et stock illimité", () => {
    const products = [
      prod({ id: "svc", type: "service", cost: 999, stock: 5 }),
      prod({ id: "asset", is_asset: true, cost: 999, stock: 2 }),
      prod({ id: "open", cost: 100, stock: Number.POSITIVE_INFINITY }),
    ];
    expect(estimateStockValue(products)).toEqual({ value: 0, known: 0, total: 0 });
  });

  it("signale une évaluation partielle quand un coût manque", () => {
    const products = [prod({ id: "a", cost: 100, stock: 2 }), prod({ id: "b", cost: 0, stock: 5 })];
    expect(estimateStockValue(products)).toEqual({ value: 200, known: 1, total: 2 });
  });
});

describe("monthlyCostOfGoods", () => {
  it("cumule les coûts figés et le CA des lignes", () => {
    const r = monthlyCostOfGoods([
      item({ id: "l1", price_at_sale: 1000, cost_at_sale: 300, quantity: 2 }),
      item({ id: "l2", price_at_sale: 500, cost_at_sale: 150, quantity: 1 }),
    ]);
    expect(r.cost).toBe(750);
    expect(r.revenue).toBe(2500);
    expect(r.coverage).toBe(1);
    expect(r.unknownLines).toBe(0);
  });

  it("marque une évaluation partielle dès qu'une ligne est sans coût", () => {
    const r = monthlyCostOfGoods([
      item({ id: "l1", price_at_sale: 1000, cost_at_sale: 300 }),
      item({ id: "l2", price_at_sale: 1000, cost_at_sale: 0 }),
    ]);
    expect(r.cost).toBe(300);
    expect(r.coverage).toBe(0.5);
    expect(r.unknownLines).toBe(1);
  });
});

describe("computeMonthlyResult", () => {
  it("valide l'exemple type : CA 1,5M · COGS 450k · charges 50k → 1,0M de bénéfice", () => {
    const r = computeMonthlyResult({
      revenue: 1500000,
      cogs: 450000,
      costComplement: 0,
      charges: 50000,
    });
    expect(r.profit).toBe(1000000);
    expect(r.marginRate).toBeCloseTo(0.667, 1);
  });

  it("déduit le complément de coût", () => {
    const r = computeMonthlyResult({ revenue: 1000, cogs: 300, costComplement: 100, charges: 50 });
    expect(r.profit).toBe(550);
  });
});

describe("resultStatus", () => {
  it("🟢 dès que le bénéfice est nul ou positif", () => {
    expect(resultStatus(0, 1000)).toBe("ok");
    expect(resultStatus(500, 1000)).toBe("ok");
  });

  it("🟠 pour une perte jusqu'à 10 % du CA", () => {
    expect(resultStatus(-100, 1000)).toBe("warn");
    expect(resultStatus(-99, 1000)).toBe("warn");
  });

  it("🔴 au-delà de 10 % du CA", () => {
    expect(resultStatus(-101, 1000)).toBe("bad");
    expect(resultStatus(-1000, 0)).toBe("bad");
  });
});
