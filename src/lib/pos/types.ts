// Types partagés par la page POS. Extraits parce que le panier, les tables et les
// dialogues ont tous besoin des mêmes formes : les redéclarer ou les passer en props
// typées à la main était la seule option tant qu'elles vivaient dans la page.

import type { Category, CartLine, Product } from "@/lib/db";

export interface FreeLine {
  key: string;
  name: string;
  price: number;
  cost: number;
  category: Category;
  quantity: number;
}

/** `key` sert au rendu et aux handlers du panier ; CartLine reste le type envoyé à la DB. */
export type UiLine = CartLine & { key: string; productType?: "product" | "service" };

export type CartEntry = {
  qty: number;
  price: number;
  cost: number;
  variant?: string;
  variant_id?: string;
};

/**
 * Destination de ce que l'on est en train de saisir.
 *
 * `direct` : vente au comptoir, encaissée sur-le-champ — le comportement historique de
 * cette page, inchangé. `table` : la saisie est une TOURNÉE qui vient s'ajouter à une
 * addition ouverte, et aucun argent n'est demandé avant l'encaissement final.
 */
export type Target = { kind: "direct" } | { kind: "table"; saleId: string };

/**
 * Panneau d'encaissement ouvert. `null` : fermé, on commande.
 * `table` : toute l'addition d'un coup — le geste de fin de service.
 * `round` : une TOURNÉE précise — encaissée au passage, la table reste ouverte pour la
 * suite de la commande.
 */
export type Cashing = null | { kind: "table" } | { kind: "round"; orderedAt: number };

/** Identifiant de ligne de panier : la variante fait partie de la clé, sinon deux
 *  tailles du même vêtement fusionneraient en une ligne au prix de la première. */
export function cartKey(p: Product, variantId?: string): string {
  return variantId ? `${p.id}::${variantId}` : p.id;
}

export const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

/** Prochain libellé du plan de salle : « 7 » après 1–6. Les libellés non numériques
 *  (« Terrasse ») gardent leur place mais ne comptent pas dans la numérotation. */
export function nextTableLabel(labels: string[]): string {
  const max = labels.reduce((m, l) => (/^\d+$/.test(l) ? Math.max(m, Number(l)) : m), 0);
  return String(max + 1);
}

/** Cycle de service d'une table. */
export type TableStage = "libre" | "to-prepare" | "preparing" | "ready" | "served" | "paid";
