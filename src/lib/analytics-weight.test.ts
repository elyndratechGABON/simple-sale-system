// Tests de l'agrégat boucherie (src/lib/analytics.ts) — fonctions pures,
// recalculables à la main, comme le reste des agrégations de l'application.
import { describe, it, expect } from "vitest";
import type { Product, SaleItem } from "./db";
import { computeWeightSales } from "./analytics";

const item = (over: Partial<SaleItem> & { id: string }): SaleItem => ({
  sale_id: "s",
  name: "",
  quantity: 1,
  price_at_sale: 1000,
  cost_at_sale: 0,
  updated_at: 0,
  sync_status: "local",
  ...over,
});

const weightProduct = (id: string, name: string): Product =>
  ({ id, name, unitType: "weight" }) as Product;

const unitProduct = (id: string, name: string): Product =>
  ({ id, name, unitType: "unit" }) as Product;

describe("computeWeightSales", () => {
  it("compte le poids total et le montant (prix au poids × poids), par produit", () => {
    const beef = weightProduct("p1", "Bœuf");
    const stats = computeWeightSales(
      [
        item({ id: "i1", product_id: "p1", name: "Bœuf", quantity: 2, price_at_sale: 3000 }),
        item({ id: "i2", product_id: "p1", name: "Bœuf", quantity: 1.5, price_at_sale: 3000 }),
      ],
      [beef],
    );
    expect(stats.weightKg).toBeCloseTo(3.5, 6);
    expect(stats.revenue).toBeCloseTo(10500, 6);
    expect(stats.byProduct).toHaveLength(1);
    expect(stats.byProduct[0]).toEqual({
      product_id: "p1",
      name: "Bœuf",
      weightKg: 3.5,
      revenue: 10500,
    });
  });

  it("calcule le poids moyen d'une pesée sur la période", () => {
    const beef = weightProduct("p1", "Bœuf");
    const stats = computeWeightSales(
      [
        item({ id: "i1", product_id: "p1", name: "Bœuf", quantity: 2, price_at_sale: 3000 }),
        item({ id: "i2", product_id: "p1", name: "Bœuf", quantity: 1.5, price_at_sale: 3000 }),
      ],
      [beef],
    );
    expect(stats.avgWeightKg).toBeCloseTo(1.75, 6);
  });

  it("ignore les articles vendus à l'unité ou sans produit au catalogue", () => {
    const beef = weightProduct("p1", "Bœuf");
    const units = unitProduct("p2", "Pain");
    const stats = computeWeightSales(
      [
        item({ id: "i1", product_id: "p2", name: "Pain", quantity: 5, price_at_sale: 500 }),
        item({ id: "i2", name: "Ligne libre", quantity: 3, price_at_sale: 400 }),
        item({ id: "i3", product_id: "p1", name: "Bœuf", quantity: 1, price_at_sale: 3000 }),
      ],
      [beef, units],
    );
    expect(stats.weightKg).toBeCloseTo(1, 6);
    expect(stats.revenue).toBeCloseTo(3000, 6);
    expect(stats.byProduct).toHaveLength(1);
  });

  it("ignore les items dont le produit n'existe plus au catalogue", () => {
    const stats = computeWeightSales(
      [item({ id: "i1", product_id: "gone", name: "Bœuf", quantity: 2, price_at_sale: 3000 })],
      [],
    );
    expect(stats.weightKg).toBeCloseTo(0, 6);
    expect(stats.revenue).toBeCloseTo(0, 6);
    expect(stats.byProduct).toEqual([]);
  });

  it("trie les produits du plus gros poids vendu au plus petit", () => {
    const a = weightProduct("p1", "Bœuf");
    const b = weightProduct("p2", "Poulet");
    const stats = computeWeightSales(
      [
        item({ id: "i1", product_id: "p2", name: "Poulet", quantity: 1, price_at_sale: 2000 }),
        item({ id: "i2", product_id: "p1", name: "Bœuf", quantity: 3, price_at_sale: 3000 }),
      ],
      [a, b],
    );
    expect(stats.byProduct[0].product_id).toBe("p1");
    expect(stats.byProduct[1].product_id).toBe("p2");
  });

  it("reste vide (zéro, poids moyen NaN) sans aucune vente au poids", () => {
    const stats = computeWeightSales([], []);
    expect(stats.weightKg).toBeCloseTo(0, 6);
    expect(stats.revenue).toBeCloseTo(0, 6);
    expect(stats.avgWeightKg).toBe(Number.NaN);
    expect(stats.byProduct).toEqual([]);
  });
});
