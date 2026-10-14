// Les charges d'une période, séparées par nature pour l'écran de saisie.
//
// FONCTION PURE : elle ne filtre rien de plus que ce que `listCharges` a déjà filtré
// (période chevauchante + `alive()`), et elle ne CALCULE aucun bénéfice.

import type { Charge } from "@/lib/db";

export interface ServiceChargeLine {
  id: string;
  /** Libellé de catégorie tel que saisi sur la charge. */
  category: string;
  amount: number;
}

export interface BusinessChargeLine {
  id: string;
  label: string;
  amount: number;
}

export interface ChargesByKind {
  services: ServiceChargeLine[];
  business: BusinessChargeLine[];
}

/**
 * Sépare les charges en deux listes, chacune triée par montant décroissant.
 *
 * **NE FUSIONNE PAS deux charges de même catégorie.** Les additionner serait pire qu'un
 * doublon : si le commerçant a saisi deux fois « Plats » sur la même période, la somme
 * affiche le double du montant réel. Le doublon se traite à l'enregistrement — on
 * RÉÉCRIT la charge existante (son `id` est renvoyé par cette fonction) au lieu d'en créer
 * une seconde. Ici, chaque ligne affichée correspond à UN enregistrement en base, ce qui
 * permet de le supprimer sans deviner lequel.
 *
 * Une charge sans catégorie (service) ni sans libellé (business) est ignorée : elle n'a pas
 * de place dans un formulaire. `Charge` ne rend pas ces champs obligatoires — la saisie, elle,
 * les rend exigeants.
 */
export function groupChargesByKind(charges: Charge[]): ChargesByKind {
  const services: ServiceChargeLine[] = [];
  const business: BusinessChargeLine[] = [];

  for (const charge of charges) {
    if (charge.kind === "service") {
      if (charge.category) {
        services.push({ id: charge.id, category: charge.category, amount: charge.amount });
      }
    } else if (charge.label) {
      business.push({ id: charge.id, label: charge.label, amount: charge.amount });
    }
  }

  services.sort((a, b) => b.amount - a.amount);
  business.sort((a, b) => b.amount - a.amount);
  return { services, business };
}
