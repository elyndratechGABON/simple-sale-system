// Saisie d'une quantité en caisse — règle pure, testée, partagée par les deux champs.
//
// POURQUOI CE FICHIER EXISTE
//
// Les deux champs de quantité de la caisse (saisie manuelle par appui long, ligne
// libre) interdisaient la virgule via `.replace(/\D/g, "")`. C'était correct tant que
// TOUT se vendait à l'unité. Le produit `unit: "kg"` (boucherie, et depuis la v23
// n'importe quel commerçant) fait que « 2,5 kg » est une quantité LEGITIME : le champ
// la refusait, et le vendeur ne pouvait peser que des entiers.
//
// La suite n'était pas mieux : `addOne` ajoutait toujours `1`, donc un tap sur un
// bifteck à 4000 FCFA/kg encaissait 1 kg au lieu du poids réellement pose sur la
// balance. Le rapport de poids (`computeWeightSales`) multipliait ensuite
// `quantity × price_at_sale` sans se douter que `quantity` etait un entier de pieces :
// un CA faux, et un stock decremente de 1 au lieu de 2,5.
//
// Aucun de ces deux defauts ne se voyait dans un test d'interface. Ils sont ici, sous
// forme de fonctions : testables sans navigateur, sans balance, sans boutique.

/** Un produit dont la quantité se saisit au poids se reconnaît à son unité. */
export function isWeightProduct(unit: string | undefined): boolean {
  return unit === "kg";
}

/**
 * Filtre une saisie de quantité.
 *
 * - au kilo : chiffres et virgule, un seul séparateur décimal, au plus 3 décimales
 *   (le centième de gramme est au-delà de toute balance de quartier) ;
 * - sinon : entiers seuls, comme avant.
 *
 * La virgule est celle du pavé numérique français ; le point est accepté puis
 * normalisé en virgule, parce que `type="number"` sur certains claviers produit un
 * point et qu'un rejet silencieux valait mieux évité.
 */
export function filterQtyInput(raw: string, weight: boolean): string {
  if (!weight) return raw.replace(/\D/g, "");
  let out = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const first = out.indexOf(".");
  if (first !== -1) {
    // Un seul séparateur décimal : les suivants sont supprimés, pas ignorés en
    // silence — « 1.2.3 » deviendrait « 1.23 », ce qui facturerait un poids faux.
    out = out.slice(0, first + 1) + out.slice(first + 1).replace(/\./g, "");
    const [whole, frac = ""] = out.split(".");
    out = `${whole}.${frac.slice(0, 3)}`;
  }
  return out;
}

/** La quantité saisie, normalisée en nombre. `fallback` si le champ est vide ou invalide. */
export function parseQty(value: string, fallback: number): number {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Le stock restant après la vente d'une quantité de panier.
 *
 * Un produit au kilo se décompte en poids : 2,5 kg retirent 2,5 du stock immédiatement,
 * pas après 2,5 ventes. C'est le défaut du `+1` codé en dur sur un produit pesé — le
 * stock descendait d'une unité par vente alors qu'on en avait vendu 2,5.
 */
export function nextQtyAfterSale(qty: number, stock: number | undefined): number {
  if (stock === undefined || !Number.isFinite(stock)) return 0;
  return Math.max(0, stock - qty);
}
