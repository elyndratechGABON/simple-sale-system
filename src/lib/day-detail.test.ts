// Tests du détail d'une journée (src/lib/analytics.ts — computeDayDetail) : la photo
// complète d'un jour du calendrier des rapports. Fonctions pures, recalculables à la main.
import { describe, it, expect } from "vitest";
import type { Sale, SaleItem } from "./db";
import { computeDayDetail } from "./analytics";

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

describe("computeDayDetail", () => {
  it("totalise le chiffre d'affaires, le bénéfice et les articles", () => {
    const sales = [sale({ id: "a", total: 1000 }), sale({ id: "b", total: 2500 })];
    const items = [
      item({ id: "x", sale_id: "a", price_at_sale: 500, cost_at_sale: 200, quantity: 2 }),
      item({ id: "y", sale_id: "b", price_at_sale: 2500, cost_at_sale: 1000, quantity: 1 }),
    ];
    const d = computeDayDetail(sales, items);
    expect(d.revenue).toBe(3500);
    expect(d.itemsCount).toBe(3);
    // (500 - 200) × 2 + (2500 - 1000) × 1
    expect(d.profit).toBe(2100);
  });

  it("compte les clients, défaut 1 par vente", () => {
    const sales = [
      sale({ id: "a", total: 100, customers_count: 3 }),
      sale({ id: "b", total: 200 }),
    ];
    expect(computeDayDetail(sales, []).customers).toBe(4);
  });

  it("répartit par moyen de paiement, espèces par défaut", () => {
    const sales = [
      sale({ id: "a", total: 1000, payment_method: "cash" }),
      sale({ id: "b", total: 2000, payment_method: "mobile_money" }),
      sale({ id: "c", total: 500 }),
    ];
    const byPayment = computeDayDetail(sales, []).byPayment;
    const cash = byPayment.find((p) => p.method === "cash");
    const mm = byPayment.find((p) => p.method === "mobile_money");
    expect(cash?.count).toBe(2);
    expect(cash?.total).toBe(1500);
    expect(mm?.total).toBe(2000);
  });

  it("agrège les produits par clé catalogue, nom pour les lignes libres", () => {
    const items = [
      item({
        id: "i1",
        sale_id: "a",
        product_id: "p1",
        name: "Coca",
        price_at_sale: 500,
        quantity: 2,
      }),
      item({
        id: "i2",
        sale_id: "b",
        product_id: "p1",
        name: "Coca",
        price_at_sale: 500,
        quantity: 1,
      }),
      item({ id: "i3", sale_id: "c", name: "Ligne libre", price_at_sale: 700 }),
    ];
    const d = computeDayDetail([], items);
    expect(d.products).toHaveLength(2);
    const coca = d.products.find((p) => p.product_id === "p1");
    expect(coca?.quantity).toBe(3);
    expect(coca?.revenue).toBe(1500);
    expect(d.products[0]?.revenue).toBe(1500); // tri par CA décroissant
  });

  it("remonte les clients nommés et les tables distincts", () => {
    const sales = [
      sale({ id: "a", total: 100, client_name: "Jean", table: "1" }),
      sale({ id: "b", total: 200, client_name: "Jean" }),
      sale({ id: "c", total: 300, table: "1" }),
    ];
    const d = computeDayDetail(sales, []);
    expect(d.clients).toEqual(["Jean"]);
    expect(d.tables).toEqual(["1"]);
  });
});
