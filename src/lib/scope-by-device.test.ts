// Tests du filtre par exploitant (src/lib/analytics.ts — scopeByDevice) : sur une
// caisse EMPLOYÉ, le tableau de bord ne doit refléter que SES encaissements, jamais
// le cumul du groupe — le CUMUL n'appartient qu'au propriétaire. Fonction pure,
// recalculable à la main.
import { describe, it, expect } from "vitest";
import type { Sale, SaleItem } from "./db";
import { scopeByDevice } from "./analytics";

const sale = (over: Partial<Sale> & { id: string; total: number }): Sale => ({
  timestamp: 0,
  cash_given: over.total,
  change_due: 0,
  day_closed: false,
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

describe("scopeByDevice", () => {
  const employee = "device-employee";
  const owner = "device-owner";
  const sales = [
    sale({ id: "mine", total: 1000, seller_device_id: employee }),
    sale({ id: "owner", total: 5000, seller_device_id: owner }),
    sale({ id: "untraced", total: 2000 }),
  ];
  const items = [
    item({ id: "i1", sale_id: "mine", price_at_sale: 1000 }),
    item({ id: "i2", sale_id: "owner", price_at_sale: 5000 }),
    item({ id: "i3", sale_id: "untraced", price_at_sale: 2000 }),
  ];

  it("ne filtre rien pour une caisse propriétaire (CUMUL du groupe)", () => {
    const scoped = scopeByDevice(sales, items, undefined);
    expect(scoped.sales.map((s) => s.id)).toEqual(["mine", "owner", "untraced"]);
    expect(scoped.items).toHaveLength(3);
  });

  it("ne garde que SES ventes (et leurs lignes) pour un employé", () => {
    const scoped = scopeByDevice(sales, items, employee);
    expect(scoped.sales.map((s) => s.id)).toEqual(["mine"]);
    expect(scoped.items.map((i) => i.id)).toEqual(["i1"]);
  });

  it("n'impute pas à l'employé une vente sans tracé d'exploitant (vente du proprio ou antérieure)", () => {
    const scoped = scopeByDevice(sales, items, employee);
    expect(scoped.sales.find((s) => s.id === "untraced")).toBeUndefined();
  });

  it("ne mélange jamais les lignes de ventes d'autrui avec les siennes", () => {
    const scoped = scopeByDevice(sales, items, employee);
    for (const line of scoped.items) {
      expect(scoped.sales.some((s) => s.id === line.sale_id)).toBe(true);
    }
  });
});