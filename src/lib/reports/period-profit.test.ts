import { test, expect } from "vitest";
import type { Product, SaleItem } from "@/lib/db";
import { periodProfit } from "./period-profit";

const produit = (id: string, over: Partial<Product> = {}): Product => ({
  id,
  name: `Produit ${id}`,
  cost: 0,
  price: 500,
  stock: 10,
  category: "Boisson",
  updated_at: 1,
  sync_status: "local",
  ...over,
});

const ligne = (over: Partial<SaleItem> = {}): SaleItem => ({
  id: "l1",
  sale_id: "s1",
  name: "Produit p1",
  quantity: 1,
  price_at_sale: 500,
  cost_at_sale: 0,
  updated_at: 1,
  sync_status: "local",
  ...over,
});

test("la marge se calcule au coût ACTUEL du catalogue, pas au coût figé à la vente", () => {
  // 5 bouteilles vendues à 500 = 2 500 de CA. Le produit a passé son coût de 300 à
  // 100 depuis : la marge affichée S'ACTUALISE — c'est toute la décision de l'onglet.
  const r = periodProfit(
    [produit("p1", { cost: 100 })],
    [
      ligne({ product_id: "p1", quantity: 2, cost_at_sale: 300 }),
      ligne({ product_id: "p1", quantity: 3 }),
    ],
  );

  expect(r.productMargin).toBe(2500 - 100 * 5);
  expect(r.serviceRevenue).toBe(0);
  expect(r.categoryRevenue["Boisson"]).toBe(2500);
});

test("une prestation rapporte son CA sans marge — son poids passe par les charges saisies", () => {
  const r = periodProfit(
    [produit("p1", { type: "service", category: "Coiffure", name: "Coupe enfant", cost: 9999 })],
    [ligne({ product_id: "p1", quantity: 2 })],
  );

  expect(r.serviceRevenue).toBe(1000);
  expect(r.productMargin).toBe(0);
  expect(r.serviceCategories).toEqual(["Coiffure"]);
});

test("les PRESTATIONS vendues sont listées par NOM, avec leur CA — la ligne de saisie", () => {
  // Deux prestations distinctes dans la même catégorie : la section « Charges de
  // service » doit montrer chacune, pas une seule ligne « Coiffure ».
  const r = periodProfit(
    [
      produit("p1", { type: "service", category: "Coiffure", name: "Coupe enfant" }),
      produit("p2", { type: "service", category: "Coiffure", name: "Coloration" }),
      produit("p3", { category: "Boisson" }),
    ],
    [
      ligne({ id: "a", product_id: "p1", quantity: 2, price_at_sale: 500 }),
      ligne({ id: "b", product_id: "p2", price_at_sale: 2000 }),
      ligne({ id: "c", product_id: "p3" }),
    ],
  );

  expect(r.servicesSold).toEqual([
    expect.objectContaining({
      product: expect.objectContaining({ name: "Coloration" }),
      revenue: 2000,
    }),
    expect.objectContaining({
      product: expect.objectContaining({ name: "Coupe enfant" }),
      revenue: 1000,
    }),
  ]);
});

test("seules les catégories VENDUES en service figurent dans serviceCategories", () => {
  const r = periodProfit(
    [
      produit("p1", { type: "service", category: "Coiffure" }),
      produit("p2", { type: "service", category: "Beauté" }), // au catalogue, jamais vendus
      produit("p3", { category: "Boisson" }),
    ],
    [ligne({ id: "a", product_id: "p1" }), ligne({ id: "b", product_id: "p3" })],
  );

  expect(r.serviceCategories).toEqual(["Coiffure"]);
  expect(r.serviceRevenue).toBe(500);
  expect(r.categoryRevenue["Beauté"]).toBeUndefined();
  // Au catalogue mais JAMAIS vendue : pas de ligne de saisie.
  expect(r.servicesSold).toHaveLength(1);
});

test("une ligne sans fiche (libre ou orpheline) n'entre dans aucun compte", () => {
  const r = periodProfit(
    [produit("p1")],
    [ligne({ id: "a" }), ligne({ id: "b", product_id: "fantome", quantity: 9 })],
  );

  expect(r.productMargin).toBe(0);
  expect(r.serviceRevenue).toBe(0);
  expect(r.serviceCategories).toEqual([]);
  expect(r.categoryRevenue).toEqual({});
});

test("un produit vendu sans coût d'achat est compté — le filet « surestimé » est fondé", () => {
  const r = periodProfit(
    [produit("p1", { cost: 0 }), produit("p2", { cost: 100 })],
    [ligne({ id: "a", product_id: "p1", quantity: 2 }), ligne({ id: "b", product_id: "p2" })],
  );

  expect(r.soldWithoutCost).toBe(1);
  // p1 : 2 × 500 − 2 × 0 = 1000 ; p2 : 500 − 100 = 400.
  expect(r.productMargin).toBe(1400);
});
