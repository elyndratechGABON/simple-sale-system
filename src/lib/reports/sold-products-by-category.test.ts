import { test, expect } from "vitest";
import type { Product, SaleItem } from "@/lib/db";
import { soldProductsByCategory } from "./sold-products-by-category";

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

const nomDe = (groups: Map<string, { product: Product }[]>, category: string) =>
  groups.get(category)?.map((e) => e.product.id) ?? [];

test("deux lignes du même produit cumulent quantité et CA", () => {
  const groups = soldProductsByCategory(
    [produit("p1")],
    [
      ligne({ id: "a", product_id: "p1", quantity: 2 }),
      ligne({ id: "b", product_id: "p1", quantity: 3 }),
    ],
  );

  const list = groups.get("Boisson")!;
  expect(list).toHaveLength(1);
  expect(list[0].quantity).toBe(5);
  expect(list[0].revenue).toBe(2500);
});

test("une ligne libre est ignorée — pas de fiche, pas de coût à saisir", () => {
  // `product_id` absent = ligne saisie à la main. Le vendeur ne peut rien y écrire,
  // l'afficher l'inviterait à chercher une fiche qui n'existe pas.
  const groups = soldProductsByCategory([produit("p1")], [ligne({ id: "a" })]);

  expect(groups.size).toBe(0);
});

test("une ligne dont le produit est absent du catalogue est ignorée", () => {
  // Le vrai cas atteignable : produit supprimé, ou identifiant orphelin. Ignoré SANS
  // trace — son coût ne sera jamais saisissable, et seule l'alerte de la page le signale.
  const groups = soldProductsByCategory(
    [produit("p1")],
    [ligne({ id: "a", product_id: "fantome" }), ligne({ id: "b", product_id: "p1" })],
  );

  expect(nomDe(groups, "Boisson")).toEqual(["p1"]);
});

test("les lignes d'une catégorie sont triées par quantité décroissante", () => {
  const groups = soldProductsByCategory(
    [produit("p1"), produit("p2"), produit("p3")],
    [
      ligne({ id: "a", product_id: "p1", quantity: 1 }),
      ligne({ id: "b", product_id: "p2", quantity: 9 }),
      ligne({ id: "c", product_id: "p3", quantity: 4 }),
    ],
  );

  expect(nomDe(groups, "Boisson")).toEqual(["p2", "p3", "p1"]);
});

test("le regroupement suit la catégorie du CATALOGUE, pas celle figée à la vente", () => {
  // Le produit a changé de catégorie depuis ses ventes : il apparaît dans SA catégorie
  // actuelle, celle où le vendeur peut aller le chercher. C'est l'inverse voulu de
  // `groupByCategory` (onglet Données), qui raconte l'historique figé.
  const groups = soldProductsByCategory(
    [produit("p1", { category: "Plats" })],
    [ligne({ id: "a", product_id: "p1", category_at_sale: "Boisson" })],
  );

  expect([...groups.keys()]).toEqual(["Plats"]);
  expect(groups.get("Boisson")).toBeUndefined();
});
