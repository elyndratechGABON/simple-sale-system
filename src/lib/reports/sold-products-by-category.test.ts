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

test("un produit supprimé du catalogue reste compté, catégorie figée à la vente", () => {
  // Le vrai cas : « riz tchiep » vendu puis supprimé. La ligne de vente ne doit JAMAIS
  // être ignorée sous prétexte que `product_id` ne figure plus dans `products`.
  const groups = soldProductsByCategory(
    [produit("p1")],
    [
      ligne({
        id: "a",
        product_id: "fantome",
        name: "Riz tchiep",
        quantity: 2,
        price_at_sale: 1000,
        cost_at_sale: 700,
        category_at_sale: "Snack",
      }),
      ligne({ id: "b", product_id: "p1" }),
    ],
  );

  const list = groups.get("Snack")!;
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ quantity: 2, revenue: 2000, orphan: true });
  expect(list[0].product).toMatchObject({
    id: "fantome",
    name: "Riz tchiep",
    cost: 700,
    category: "Snack",
  });
  expect(groups.get("Boisson")).toHaveLength(1);
});

test("une catégorie absente de la vente retombe sur « Autre »", () => {
  const groups = soldProductsByCategory([], [ligne({ id: "a", product_id: "fantome" })]);

  expect([...groups.keys()]).toEqual(["Autre"]);
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
