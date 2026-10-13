// Tests des opérations de RETRAIT au panier, et de projection du panier vers l'affichage
// (`toLines`) — la jointure qui sert aussi bien à la caisse qu'à la base de vente.
import { describe, it, expect } from "vitest";
import type { CartEntry, FreeLine } from "@/lib/pos/types";
import { removeLine, removeOneFromLine, toLines } from "@/lib/pos/cart-ops";
import { produit } from "./cart-ops-helpers";

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
