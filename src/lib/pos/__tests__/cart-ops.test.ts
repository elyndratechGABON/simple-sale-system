// Tests des opérations de panier.
//
// C'est le PREMIER code du panier testable : avant ce fichier, `addEntry` était une
// closure dans un composant de 1760 lignes, donc vérifiable seulement en Minerals à
// la main sur un téléphone. Or le stock insuffisant est un refus SILENCIEUX côté
// interface : le vendeur voit sa ligne disparaître et comprend « stock épuisé » sans
// jamais avoir vu le message.

import { describe, it, expect } from "vitest";
import type { Product } from "@/lib/db";
import type { CartEntry, FreeLine } from "@/lib/pos/types";
import {
  addOneToLine,
  addToCart,
  removeLine,
  removeOneFromLine,
  toLines,
  variantOf,
} from "@/lib/pos/cart-ops";

const produit = (over: Partial<Product> = {}): Product =>
  ({
    id: "p1",
    name: "Bœuf",
    cost: 2000,
    price: 4000,
    stock: 10,
    category: "Viandes",
    ...over,
  }) as Product;

const service = (over: Partial<Product> = {}): Product =>
  ({ ...produit(), id: "s1", name: "Coupe", type: "service", stock: 0, ...over }) as Product;

describe("variantOf", () => {
  const p = produit({
    variants: [
      { id: "v1", name: "M", price: 15000 },
      { id: "v2", name: "L", price: 16000 },
    ],
  });

  it("retrouve la variante demandée", () => {
    expect(variantOf(p, "v2")?.name).toBe("L");
  });

  it("renvoie rien sans id, sans variante, ou si l'id ne correspond pas", () => {
    expect(variantOf(p)).toBeUndefined();
    expect(variantOf(p, "inconnu")).toBeUndefined();
    expect(variantOf(produit(), "v1")).toBeUndefined();
  });
});

describe("addToCart — refus de stock", () => {
  it("accepte sous le stock", () => {
    const r = addToCart({}, produit(), undefined, 3);
    expect(r.refused).toBe(false);
    expect(r.cart.p1.qty).toBe(3);
  });

  it("refuse AU-DELÀ du stock, et renvoie le panier INCHANGÉ", () => {
    const base = { p1: { qty: 8, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    const r = addToCart(base, produit(), undefined, 3); // 8 + 3 > 10
    expect(r.refused).toBe(true);
    // Le refus ne doit surtout pas avoir modifié le panier : sinon le vendeur verrait
    // sa quantité changer pour une vente refusée.
    expect(r.cart).toBe(base);
    expect(r.cart.p1.qty).toBe(8);
  });

  it("cumule les ajouts successifs avant de refuser", () => {
    let cart: Record<string, CartEntry> = {};
    cart = addToCart(cart, produit(), undefined, 6).cart;
    expect(addToCart(cart, produit(), undefined, 4).refused).toBe(false); // 6 + 4 = 10
    cart = addToCart(cart, produit(), undefined, 4).cart;
    expect(cart.p1.qty).toBe(10);
    expect(addToCart(cart, produit(), undefined, 1).refused).toBe(true); // 10 + 1 > 10
  });

  it("un service n'a pas de stock : jamais refusé", () => {
    expect(addToCart({}, service(), undefined, 99).refused).toBe(false);
  });

  it("un stock INFINI est l'absence de suivi, pas « 0 disponible »", () => {
    const p = produit({ stock: Number.POSITIVE_INFINITY });
    expect(addToCart({}, p, undefined, 500).refused).toBe(false);
  });

  it("accepte une quantité DÉCIMALE (vente au kilo)", () => {
    const r = addToCart({}, produit({ stock: 5 }), undefined, 2.5);
    expect(r.refused).toBe(false);
    expect(r.cart.p1.qty).toBe(2.5);
    // 2.5 + 3 = 5.5 > 5 → refusé, et c'est bien ce qu'on veut.
    expect(addToCart(r.cart, produit({ stock: 5 }), undefined, 3).refused).toBe(true);
  });

  it("le stock de la VARIANTE prime sur celui du produit", () => {
    const p = produit({
      stock: 0, // produitParent épuisé…
      variants: [{ id: "v1", name: "M", price: 15000, stock: 4 }],
    });
    expect(addToCart({}, p, "v1", 2).refused).toBe(false); // …mais la variante a du stock
    expect(addToCart({}, p, "v1", 5).refused).toBe(true);
  });

  it("la variante donne son propre prix et son propre stock à la ligne", () => {
    const p = produit({
      variants: [{ id: "v1", name: "L", price: 16000, cost: 8000, stock: 3 }],
    });
    const r = addToCart({}, p, "v1", 1);
    expect(r.cart["p1::v1"].price).toBe(16000);
    expect(r.cart["p1::v1"].cost).toBe(8000);
    expect(r.cart["p1::v1"].variant).toBe("L");
    expect(r.cart["p1::v1"].variant_id).toBe("v1");
  });
});

describe("addOneToLine — stepper +1", () => {
  it("incrémente sans toucher au prix", () => {
    const base = { p1: { qty: 2, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    const r = addOneToLine(base, produit(), "p1");
    expect(r.cart.p1.qty).toBe(3);
    expect(r.cart.p1.price).toBe(4000);
  });

  it("refuse si la ligne dépasse le stock, panier inchangé", () => {
    const base = { p1: { qty: 10, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    const r = addOneToLine(base, produit({ stock: 10 }), "p1");
    expect(r.refused).toBe(true);
    expect(r.cart).toBe(base);
  });

  it("une ligne absente ne fait rien et ne refuse pas", () => {
    const base = {} as Record<string, CartEntry>;
    const r = addOneToLine(base, produit(), "inconnu");
    expect(r.cart).toBe(base);
    expect(r.refused).toBe(false);
  });
});

describe("removeOneFromLine — la ligne DISPARAÎT à zéro", () => {
  it("décrémente", () => {
    const base = { p1: { qty: 3, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    expect(removeOneFromLine(base, "p1").p1.qty).toBe(2);
  });

  it("supprime la ligne plutôt que de laisser une quantité nulle", () => {
    const base = { p1: { qty: 1, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    const r = removeOneFromLine(base, "p1");
    // Une quantité nulle affichée est un montant nul qui bloque l'encaissement, et le
    // vendeur ne comprend pas pourquoi son total reste à zéro.
    expect(r.p1).toBeUndefined();
    expect(Object.keys(r)).toHaveLength(0);
  });

  it("supprime aussi sous zéro", () => {
    const base = { p1: { qty: 0.5, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    expect(removeOneFromLine(base, "p1").p1).toBeUndefined();
  });
});

describe("removeLine", () => {
  it("retire la ligne", () => {
    const base = {
      p1: { qty: 1, price: 1, cost: 1 },
      p2: { qty: 1, price: 1, cost: 1 },
    } as Record<string, CartEntry>;
    const r = removeLine(base, "p1");
    expect(r.p1).toBeUndefined();
    expect(r.p2).toBeDefined();
  });
});

describe("toLines — projection vers l'affichage et la base", () => {
  it("joint le panier au catalogue pour en tirer les lignes", () => {
    const cart = { p1: { qty: 2, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    const lines = toLines(cart, [produit()], []);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      key: "p1",
      product_id: "p1",
      name: "Bœuf",
      quantity: 2,
      price: 4000,
      category: "Viandes",
    });
  });

  it("écarte une ligne dont le produit a quitté le catalogue", () => {
    const cart = { p1: { qty: 2, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    // Le produit a été supprimé pendant que la vente était en cours : la ligne doit
    // disparaître, pas rester avec un prix et un nombecome fantômes.
    expect(toLines(cart, [], [])).toHaveLength(0);
  });

  it("écarte une quantité nulle", () => {
    const cart = { p1: { qty: 0, price: 4000, cost: 2000 } } as Record<string, CartEntry>;
    expect(toLines(cart, [produit()], [])).toHaveLength(0);
  });

  it("retrouve la variante par son suffixe de clé", () => {
    const p = produit({ variants: [{ id: "v1", name: "M", price: 15000 }] });
    const cart = {
      "p1::v1": { qty: 1, price: 15000, cost: 2000, variant: "M", variant_id: "v1" },
    } as Record<string, CartEntry>;
    const lines = toLines(cart, [p], []);
    expect(lines[0].variant_id).toBe("v1");
    expect(lines[0].price).toBe(15000);
  });

  it("ajoute les lignes libres APRÈS le catalogue", () => {
    const free = {
      key: "libre_1",
      name: "Regab",
      price: 300,
      cost: 0,
      quantity: 1,
    } as unknown as FreeLine;
    const lines = toLines({}, [], [free as never]);
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe("Regab");
  });
});
