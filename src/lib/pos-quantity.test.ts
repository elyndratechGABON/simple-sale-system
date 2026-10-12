// Tests de la saisie de quantité en caisse (src/lib/pos-quantity.ts).
//
// Le défaut que ces tests verrouillent était un CA faux, pas un affichage faux :
// le champ refusait « 2,5 », l'appui long arrondissait, et le rapport de poids
// multipliait ensuite un entier de pièces par le prix au kilo.

import { describe, it, expect } from "vitest";
import { isWeightProduct, filterQtyInput, parseQty, nextQtyAfterSale } from "./pos-quantity";

describe("isWeightProduct", () => {
  it("ne reconnaît que le kilo comme vente au poids", () => {
    expect(isWeightProduct("kg")).toBe(true);
    expect(isWeightProduct("piece")).toBe(false);
    expect(isWeightProduct("liter")).toBe(false);
    expect(isWeightProduct("meter")).toBe(false);
    expect(isWeightProduct(undefined)).toBe(false);
  });
});

describe("filterQtyInput — produit à l'unité", () => {
  it("accepte les entiers, rejette tout le reste (comportement historique)", () => {
    expect(filterQtyInput("12", false)).toBe("12");
    expect(filterQtyInput("1a2b3", false)).toBe("123");
    expect(filterQtyInput("2,5", false)).toBe("25");
    expect(filterQtyInput("2.5", false)).toBe("25");
    expect(filterQtyInput("", false)).toBe("");
  });
});

describe("filterQtyInput — produit au kilo", () => {
  it("accepte la virgule française", () => {
    expect(filterQtyInput("2,5", true)).toBe("2.5");
    expect(filterQtyInput("0,5", true)).toBe("0.5");
  });

  it("accepte le point et le rend cohérent", () => {
    expect(filterQtyInput("2.5", true)).toBe("2.5");
  });

  it("ne garde qu'un seul séparateur décimal", () => {
    // « 1.2.3 » deviendrait « 1.23 » si on ignorait les points suivants en silence :
    // on supprimerait 0,1 kg au vendeur, et il facturerait un poids qu'il n'a pas
    // posé sur la balance.
    expect(filterQtyInput("1.2.3", true)).toBe("1.23");
    expect(filterQtyInput("1,2,3", true)).toBe("1.23");
  });

  it("borne à 3 décimales (au-delà du gramme)", () => {
    expect(filterQtyInput("1.23456", true)).toBe("1.234");
    expect(filterQtyInput("2,9999", true)).toBe("2.999");
  });

  it("tolère la saisie en cours (virgule seule, point final)", () => {
    expect(filterQtyInput("2,", true)).toBe("2.");
    expect(filterQtyInput("0,00", true)).toBe("0.00");
  });

  it("écarte les lettres et symboles", () => {
    expect(filterQtyInput("kg 2,5", true)).toBe("2.5");
    expect(filterQtyInput("-3", true)).toBe("3");
  });
});

describe("parseQty", () => {
  it("lit la virgule française — Number() seul donnerait NaN", () => {
    expect(parseQty("2,5", 1)).toBe(2.5);
    expect(parseQty("2.5", 1)).toBe(2.5);
    expect(parseQty("3", 1)).toBe(3);
  });

  it("retombe sur le repli si vide, zéro ou illisible", () => {
    expect(parseQty("", 1)).toBe(1);
    expect(parseQty("0", 1)).toBe(1);
    expect(parseQty("-2", 1)).toBe(1);
    expect(parseQty("abc", 4)).toBe(4);
  });
});

describe("nextQtyAfterSale", () => {
  it("décompte en POIDS, pas en unités", () => {
    // Le défaut historique : vendre 2,5 kg ne retirait que 1 du stock.
    expect(nextQtyAfterSale(2.5, 10)).toBe(7.5);
    expect(nextQtyAfterSale(2.5, 3)).toBe(0.5);
  });

  it("ne descend jamais sous zéro", () => {
    expect(nextQtyAfterSale(5, 3)).toBe(0);
  });

  it("un stock infini reste infini (0 = pas de suivi)", () => {
    expect(nextQtyAfterSale(2.5, Number.POSITIVE_INFINITY)).toBe(0);
    expect(nextQtyAfterSale(2.5, undefined)).toBe(0);
  });
});

/**
 * Le cas métier complet, écrit comme le vendeur le vit : 2,5 kg de bœuf à
 * 4000 FCFA/kg doivent encaisser 10 000, pas 4 000 (tap à 1) ni 12 000 (arrondi à 3).
 */
describe("2,5 kg de bœuf à 4000 FCFA/kg", () => {
  const PRIX_KG = 4000;

  it("la saisie produit la quantité attendue", () => {
    const saisie = filterQtyInput("2,5", true);
    expect(parseQty(saisie, 1)).toBe(2.5);
  });

  it("le montant encaissé est le poids × le prix", () => {
    const qty = parseQty(filterQtyInput("2,5", true), 1);
    expect(qty * PRIX_KG).toBe(10_000);
  });

  it("et ce montant diffère bien des deux bugs historiques", () => {
    const qty = parseQty(filterQtyInput("2,5", true), 1);
    expect(1 * PRIX_KG).toBe(4_000); // tap simple : 1 kg
    expect(Math.round(2.5) * PRIX_KG).toBe(12_000); // arrondi à l'entier
    expect(qty * PRIX_KG).toBe(10_000); // correct
  });
});
