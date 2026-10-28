// Opérations PURES sur le panier.
//
// Isolé du hook parce que ce sont des fonctions sans état : elles prennent un panier,
// renvoient un panier. C'est ce qui les rend testables — et le panier est précisément
// l'endroit où une erreur coûte de l'argent, donc le seul qui mérite d'être testé.
//
// Règle qui traverse tout ce fichier : **une fonction pure ne dit jamais « non »**. Elle
// renvoie le panier inchangé quand l'ajout est refusé, et c'est à l'appelant d'afficher
// l'avertissement. Un `toast` ici mélangerait la règle métier à l'affichage et
// empêcherait de tester un refus de stock sans navigateur.

import type { Product } from "@/lib/db";
import { cartKey, type CartEntry, type UiLine } from "./types";

export type CartResult = { cart: Record<string, CartEntry>; refused: boolean };

/** La variante demandée, ou rien si le produit n'en a pas ou si l'id ne correspond pas. */
export function variantOf(p: Product, variantId?: string) {
  if (!variantId || !p.variants?.length) return undefined;
  return p.variants.find((v) => v.id === variantId);
}

/**
 * Ajoute une quantité au panier.
 *
 * Refuse (et renvoie le panier inchangé) si la quantité demandée dépasse le stock. Deux
 * échappatoires, inchangées : un service n'a pas de stock, et un stock infini
 * (`POSITIVE_INFINITY`) est l'absence de suivi — ce n'est pas « 0 disponible ».
 *
 * La comparaison est en nombres réels : 2,5 kg sur un stock de 5 passe, 6 ne passe pas.
 */
export function addToCart(
  cart: Record<string, CartEntry>,
  p: Product,
  variantId: string | undefined,
  qty: number,
): CartResult {
  const v = variantOf(p, variantId);
  const key = cartKey(p, variantId);
  const price = v?.price ?? p.price;
  const cost = v?.cost ?? p.cost;
  const stock = v?.stock ?? p.stock;
  const cur = cart[key];
  const next = (cur?.qty ?? 0) + qty;
  const entry = {
    qty: next,
    price,
    cost,
    ...(v ? { variant: v.name, variant_id: v.id } : {}),
  };
  if (p.type === "service" || stock === Number.POSITIVE_INFINITY || stock === undefined) {
    return { cart: { ...cart, [key]: entry }, refused: false };
  }
  if (next > stock + 1e-9) return { cart, refused: true };
  return { cart: { ...cart, [key]: entry }, refused: false };
}

/**
 * Ajoute UNE unité à une ligne existante (stepper + de la ligne de panier).
 *
 * Distinct d'`addToCart` : ici la ligne est déjà là, son prix et sa variante sont
 * figés, et seul le stock est re-vérifié. Refixer le prix à chaque incrément
 * remettrait le panier au prix du jour si le catalogue avait changé entre-temps — la
 * vente doit partir du prix affiché.
 */
export function addOneToLine(
  cart: Record<string, CartEntry>,
  p: Product | undefined,
  key: string,
): CartResult {
  const cur = cart[key];
  if (!cur) return { cart, refused: false };
  // Un service n'a pas de stock : aucune garde de quantité, même si sa fiche
  // traîne un stock fini d'avant le suivi.
  if (p?.type === "service") {
    return { cart: { ...cart, [key]: { ...cur, qty: cur.qty + 1 } }, refused: false };
  }
  const v = p ? variantOf(p, cur.variant_id) : undefined;
  const stock = v?.stock ?? p?.stock;
  if (stock !== undefined && cur.qty + 1 > stock + 1e-9) return { cart, refused: true };
  return { cart: { ...cart, [key]: { ...cur, qty: cur.qty + 1 } }, refused: false };
}

/**
 * Retire une unité. La ligne DISPARAÎT à zéro : une quantité nulle affichée est un
 * montant nul qui bloque l'encaissement sans que le vendeur comprenne pourquoi.
 */
export function removeOneFromLine(
  cart: Record<string, CartEntry>,
  key: string,
): Record<string, CartEntry> {
  const cur = cart[key];
  if (!cur) return cart;
  const next = cur.qty - 1;
  if (next <= 0) {
    const copy = { ...cart };
    delete copy[key];
    return copy;
  }
  return { ...cart, [key]: { ...cur, qty: next } };
}

export function removeLine(
  cart: Record<string, CartEntry>,
  key: string,
): Record<string, CartEntry> {
  const copy = { ...cart };
  delete copy[key];
  return copy;
}

/** Projette le panier sur les lignes affichées et envoyées à la base. */
export function toLines(
  cart: Record<string, CartEntry>,
  products: Product[],
  freeLines: UiLine[],
): UiLine[] {
  const fromCatalog = Object.entries(cart)
    .map(([key, e]): UiLine | null => {
      const [pid] = key.split("::");
      const p = products.find((x) => x.id === pid);
      if (!p || e.qty <= 0) return null;
      return {
        key,
        product_id: p.id,
        name: p.name,
        price: e.price,
        cost: e.cost,
        category: p.category,
        quantity: e.qty,
        productType: p.type,
        ...(e.variant ? { variant: e.variant } : {}),
        ...(e.variant_id ? { variant_id: e.variant_id } : {}),
      };
    })
    .filter((x): x is UiLine => Boolean(x));
  return [...fromCatalog, ...freeLines];
}
