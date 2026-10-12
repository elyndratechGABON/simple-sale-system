// Cycle de vie d'une table, lu sur ses données — aucun geste supplémentaire.
//
// Une table sans étape cuisine (bar, snack) saute directement de "to-prepare" à
// "served"/"paid". Chaque étape a sa couleur sur le plan de salle.

import type { Sale } from "@/lib/db";
import type { TableStage } from "@/lib/pos/types";

/**
 * Étape d'une table :
 *  - "libre"      : aucune addition ouverte.
 *  - "to-prepare" : table ouverte, commande prise, pas encore passée en cuisine.
 *  - "preparing"  : la cuisine a pris la commande (`preparing_at` défini).
 *  - "ready"      : la cuisine a terminé, à servir (`ready_at` défini).
 *  - "served"     : commande servie mais pas encore payée (`served_at` défini).
 *  - "paid"       : table dont au moins une tournée a été encaissée (`rounds_paid`)
 *                   ou entièrement réglée.
 */
export function tableStage(table: Sale | null): TableStage {
  if (!table) return "libre";
  // Réglée (totalement ou partiellement encaissée)
  if ((table.rounds_paid ?? 0) > 0 || table.total <= 0) return "paid";
  // Servie : la commande a été livrée, paiement débloqué
  if (table.served_at) return "served";
  // Prête : la cuisine a terminé, la commande n'attend plus qu'à être portée
  if (table.ready_at) return "ready";
  // En préparation : la cuisine a pris la commande en main
  if (table.preparing_at) return "preparing";
  // À préparer : table ouverte, commande prise, pas encore passée en cuisine
  return "to-prepare";
}

/** Durée d'un appui long, en ms. En dessous, un tap un peu lent libérerait une table. */
export const LONG_PRESS_MS = 500;
