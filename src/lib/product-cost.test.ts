// Tests de la règle « le formulaire ne réécrit plus le coût » (PRD v2.0 §5.2).
//
// `cost` a quitté le formulaire produit : il se saisit en Comptabilité, onglet « Coûts ».
// Le risque n'est pas l'affichage, c'est l'ÉCRASEMENT. `updateProduct` fait un PUT
// complet (`{ ...p }`) : si le formulaire réécrivait `cost: 0`, un renommage de produit
// effacerait un coût saisi depuis la comptabilité. Le bénéfice du mois serait faux sans
// qu'aucune erreur ne s'affiche.
//
// Cette règle est donc exprimée ici comme une fonction pure, la seule partie de la
// décision qui mérite un test : le reste est du JSX.

import { describe, it, expect } from "vitest";

/** Ce que le formulaire écrit dans `addProduct`/`updateProduct`. */
export function formCostOf(editing: { cost?: number } | undefined): number {
  // Création : 0 = « coût inconnu » (l'état normal d'un produit dont le prix d'achat
  // n'a pas encore été saisi). Édition : on REPREND l'existant, jamais 0 par défaut.
  return editing?.cost ?? 0;
}

describe("coût à l'enregistrement d'un produit", () => {
  it("une création part à 0 (coût inconnu)", () => {
    expect(formCostOf(undefined)).toBe(0);
    expect(formCostOf({})).toBe(0);
  });

  it("une édition REPREND le coût existant — ne l'efface jamais", () => {
    expect(formCostOf({ cost: 200 })).toBe(200);
    expect(formCostOf({ cost: 0 })).toBe(0);
  });

  it("le scénario du bug : renommer un produit ne remet pas son coût à 0", () => {
    const produit = { id: "p1", name: "Bœuf", cost: 1750, price: 4000 };
    // L'utilisateur corrige le nom et enregistre.
    const apres = { ...produit, name: "Bœuf - Stadt" };
    expect(apres.cost).toBe(1750);
    // Un formulaire qui réécrivait 0 donnerait ici 0 : bénéfice faux, aucune erreur visible.
    expect(formCostOf(produit)).not.toBe(0);
  });

  it("un coût réellement nul reste nul (0 = inconnu, pas 'absent')", () => {
    expect(formCostOf({ cost: 0 })).toBe(0);
  });
});
