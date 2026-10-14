import { test, expect } from "vitest";
import type { SaleItem } from "@/lib/db";
import { groupByCategory } from "./group-by-category";

/** Une ligne de vente minimale : le regroupement ne lit que ces champs. */
const ligne = (over: Partial<SaleItem> = {}): SaleItem => ({
  id: "l1",
  sale_id: "s1",
  name: "Eau",
  quantity: 1,
  price_at_sale: 500,
  cost_at_sale: 300,
  category_at_sale: "Boisson",
  updated_at: 1,
  sync_status: "local",
  ...over,
});

test("deux lignes du même produit cumulent quantité et montant", () => {
  const groups = groupByCategory([
    ligne({ id: "a", product_id: "p1", quantity: 2, price_at_sale: 500 }),
    ligne({ id: "b", product_id: "p1", quantity: 3, price_at_sale: 500 }),
  ]);

  expect(groups).toHaveLength(1);
  expect(groups[0].lines).toHaveLength(1);
  expect(groups[0].lines[0].quantity).toBe(5);
  expect(groups[0].lines[0].total).toBe(2500);
  expect(groups[0].total).toBe(2500);
});

test("catégories par montant décroissant, lignes par quantité décroissante", () => {
  const groups = groupByCategory([
    ligne({ id: "a", product_id: "p1", name: "Eau", quantity: 1, price_at_sale: 500 }),
    ligne({ id: "b", product_id: "p2", name: "Coca", quantity: 9, price_at_sale: 100 }),
    ligne({
      id: "c",
      product_id: "p3",
      name: "Pizza",
      quantity: 1,
      price_at_sale: 20_000,
      category_at_sale: "Plats",
    }),
  ]);

  // Plats (20 000) avant Boissons (1 400) — le montant décide, pas l'ordre d'écriture.
  expect(groups.map((g) => g.category)).toEqual(["Plats", "Boisson"]);
  // Dans Boissons : Coca ×9 avant Eau ×1.
  expect(groups[1].lines.map((l) => l.label)).toEqual(["Coca", "Eau"]);
});

test("une ligne sans catégorie tombe dans « Autre »", () => {
  // `category_at_sale` est absent sur les ventes antérieures au suivi : la catégorie de
  // la fiche produit ne doit pas être consultée pour la deviner (cf. SaleItem).
  const groups = groupByCategory([
    ligne({ id: "a", product_id: "p1", category_at_sale: undefined }),
  ]);

  expect(groups).toHaveLength(1);
  expect(groups[0].category).toBe("Autre");
});

test("deux « Eau » sans product_id commun restent deux lignes", () => {
  // Clé = `product_id ?? name` : sans `product_id`, la clé EST le nom — deux lignes
  // libres homonymes se cumulent, donc il faut deux clés distinctes, pas deux libellés.
  const groups = groupByCategory([
    ligne({ id: "a", product_id: "p1", name: "Eau", quantity: 1, price_at_sale: 500 }),
    ligne({ id: "b", name: "Eau", quantity: 4, price_at_sale: 500 }),
  ]);

  expect(groups[0].lines).toHaveLength(2);
  // Comparaison sans ordre : ce test porte sur la DISTINCTION des clés. Le tri par
  // quantité décroissante est couvert plus haut (ici la ligne libre est en tête, ×4).
  expect(groups[0].lines.map((l) => l.key).sort()).toEqual(["Eau", "p1"]);
  expect(groups[0].total).toBe(2500);
});

test("un produit renommé reste sur une seule ligne", () => {
  // La clé est `product_id` (stable), le libellé est celui de la PREMIÈRE vente. Deux
  // ventes d'un produit renommé ne doivent pas doubler la ligne — sinon DataTab et
  // « Top produits » montreraient deux décomptes différents sur le même écran.
  const groups = groupByCategory([
    ligne({ id: "a", product_id: "p1", name: "Eau", quantity: 1, price_at_sale: 500 }),
    ligne({ id: "b", product_id: "p1", name: "Eau minérale", quantity: 1, price_at_sale: 500 }),
  ]);

  expect(groups[0].lines).toHaveLength(1);
  expect(groups[0].total).toBe(1000);
});
