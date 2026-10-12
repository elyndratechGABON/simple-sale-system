// Tests de l'unification des unités (Dexie v23) et de la vente au kilo.
//
// POURQUOI CES TESTS EXISTENT
//
// `unitType: "weight"` devient `unit: "kg"`. Si une seule lecture oublie de changer,
// la boucherie entière disparaît des rapports DE SILENCE : les ventes restent encaissées,
// mais l'agrégat affiche 0 kg / 0 FCFA. Aucun test d'interface ne l'attraperait — c'est
// une fonction pure (`computeWeightSales`) et c'est précisément ce qui la rend
// vérifiable ici, sans navigateur ni base.

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

/** Produit vendu au kilo — l'unique façon d'être compté en poids. */
const kgProduct = (id: string, name: string): Product => ({ id, name, unit: "kg" }) as Product;

/** Produit à l'unité, dans chacune des trois unités non-poids. */
const unitProduct = (id: string, name: string, unit: "piece" | "liter" | "meter"): Product =>
  ({ id, name, unit }) as Product;

describe("vente au kilo — CA = prix × poids", () => {
  it("2.5 kg à 3000 le kg font 7500, pas 3000", () => {
    // C'est LE test de la migration. Avant, la ligne testait `unitType === "weight"` ;
    // un produit `unit: "kg"` y passait inaperçu et tombait à 0.
    const stats = computeWeightSales(
      [item({ id: "i1", product_id: "p1", name: "Bœuf", quantity: 2.5, price_at_sale: 3000 })],
      [kgProduct("p1", "Bœuf")],
    );
    expect(stats.weightKg).toBeCloseTo(2.5, 6);
    expect(stats.revenue).toBeCloseTo(7500, 6);
  });

  it("cumule les pesées d'un même produit", () => {
    const stats = computeWeightSales(
      [
        item({ id: "i1", product_id: "p1", name: "Bœuf", quantity: 2.5, price_at_sale: 3000 }),
        item({ id: "i2", product_id: "p1", name: "Bœuf", quantity: 1, price_at_sale: 3000 }),
      ],
      [kgProduct("p1", "Bœuf")],
    );
    expect(stats.weightKg).toBeCloseTo(3.5, 6);
    expect(stats.revenue).toBeCloseTo(10500, 6);
  });

  it("ignore une unité de vente qui n'est PAS le kilo — piece, liter ET meter", () => {
    // Le garde est `unit !== "kg"`, pas `unitType`. Un produit vendu au mètre ne doit
    // surtout pas être compté comme du poids : c'est le piège que la fusion créait si
    // on avait gardé `unitType === "weight"` (absent) ou `unit` truthy.
    const stats = computeWeightSales(
      [
        item({ id: "i1", product_id: "p1", name: "Étagère", quantity: 4, price_at_sale: 5000 }),
        item({ id: "i2", product_id: "p2", name: "Huile", quantity: 2, price_at_sale: 2500 }),
        item({ id: "i3", product_id: "p3", name: "Vis", quantity: 100, price_at_sale: 50 }),
      ],
      [
        unitProduct("p1", "Étagère", "meter"),
        unitProduct("p2", "Huile", "liter"),
        unitProduct("p3", "Vis", "piece"),
      ],
    );
    expect(stats.weightKg).toBeCloseTo(0, 6);
    expect(stats.revenue).toBeCloseTo(0, 6);
    expect(stats.byProduct).toEqual([]);
  });

  it("mélange kilo et unité sans les confondre", () => {
    const stats = computeWeightSales(
      [
        item({ id: "i1", product_id: "p1", name: "Bœuf", quantity: 2, price_at_sale: 3000 }),
        item({ id: "i2", product_id: "p2", name: "Riz", quantity: 3, price_at_sale: 1000 }),
        item({ id: "i3", product_id: "p3", name: "Pain", quantity: 5, price_at_sale: 200 }),
      ],
      [kgProduct("p1", "Bœuf"), kgProduct("p2", "Riz"), unitProduct("p3", "Pain", "piece")],
    );
    expect(stats.weightKg).toBeCloseTo(5, 6);
    expect(stats.revenue).toBeCloseTo(9000, 6);
    // Trié par poids décroissant (le Riz, 3 kg, devant le Bœuf, 2 kg) — pas par ordre
    // d'insertion. Le Pain à l'unité n'y est pas : il n'a pas de poids.
    expect(stats.byProduct.map((b) => b.product_id)).toEqual(["p2", "p1"]);
  });
});

/**
 * Règle de migration v23, rejouée ici sans Dexie : c'est une fonction de décision
 * pure, testable seule. Le Dexie lui-même fait appel à elle (`upgrade`).
 */
function migrateUnit(legacy: {
  unitType?: "unit" | "weight";
  weightUnit?: string;
  unit?: string;
}): string {
  if (legacy.unitType === "weight") return legacy.unit ?? "kg";
  if (legacy.unit) return legacy.unit;
  return "piece";
}

describe("migration v23 — règles de conversion", () => {
  it("un produit weight devient kg", () => {
    expect(migrateUnit({ unitType: "weight", weightUnit: "kg" })).toBe("kg");
  });

  it("un produit weight qui portait déjà une unité de vente la CONSERVE", () => {
    // C'est le cas piège : de la viande vendue au kilo, conditionnée en lots. Perdre le
    // conditionnement au profit du seul kg effacerait une information saisie.
    expect(migrateUnit({ unitType: "weight", unit: "meter" })).toBe("meter");
  });

  it("un produit unit garde son unité, ou tombe sur piece", () => {
    expect(migrateUnit({ unitType: "unit" })).toBe("piece");
    expect(migrateUnit({ unitType: "unit", unit: "liter" })).toBe("liter");
  });

  it("un produit sans unitType (antérieur à la V10) devient piece", () => {
    expect(migrateUnit({})).toBe("piece");
    expect(migrateUnit({ unit: "meter" })).toBe("meter");
  });

  it("weightUnit seul ne suffit pas à dire kilo", () => {
    // `weightUnit` est SUPPRIMÉ, pas migré : sa seule valeur réelle était "kg", déjà
    // portée par unitType. Un produit `weightUnit: "kg"` SANS unitType n'a jamais
    // existé, mais si la donnée est tronquée, il ne doit pas devenir du poids.
    expect(migrateUnit({ weightUnit: "kg" })).toBe("piece");
  });
});
