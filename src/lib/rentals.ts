// Utilitaires métier PURE des locations (cluster 'location') — ni hooks, ni DB, ni React.
//
// Source de vérité unique des formules de calcul : la facturation des écrans
// (RentalBookingDialog, RentalView…) et les agrégats des rapports (analytics.ts) partagent
// la même arithmétique. Autrefois recopiée dans `use-rentals.ts` (hooks) et `analytics.ts`
// (pur) avec des constantes dupliquées : toute divergence entre les deux falsifiait soit le
// devis, soit le rapport. Un seul jumeau, ici, pour que les deux restent synchrones.
import type { Rental } from "@/lib/db";

export const RENTAL_HOUR_MS = 3_600_000;
export const RENTAL_DAY_MS = 86_400_000;
export const RENTAL_YEAR_MS = 365 * RENTAL_DAY_MS;

/** Unités de temps écoulées entre deux dates, arrondies à l'unité supérieure (entamée = payée). */
export function unitsBetween(start: number, end: number, unit: Rental["pricing_unit"]): number {
  const ms = end - start;
  switch (unit) {
    case "hour":
      return Math.ceil(ms / RENTAL_HOUR_MS);
    case "day":
      return Math.ceil(ms / RENTAL_DAY_MS);
    case "week":
      return Math.ceil(ms / (7 * RENTAL_DAY_MS));
    case "month":
      return Math.ceil(ms / (30 * RENTAL_DAY_MS));
    case "year":
      return Math.ceil(ms / RENTAL_YEAR_MS);
  }
}

/** Coût total d'une location : prix unitaire × quantité × unités de temps. */
export function rentalTotal(
  pricePerUnit: number,
  quantity: number,
  start: number,
  end: number,
  unit: Rental["pricing_unit"],
): number {
  return pricePerUnit * quantity * unitsBetween(start, end, unit);
}

/** Jours de retard, 0 si le retour n'est pas en retard. */
export function overdueDays(expectedEnd: number): number {
  const now = Date.now();
  if (now <= expectedEnd) return 0;
  return Math.ceil((now - expectedEnd) / RENTAL_DAY_MS);
}

/** Pénalité de retard : 10 % du total par jour de retard. */
export function lateFee(total: number, expectedEnd: number): number {
  const days = overdueDays(expectedEnd);
  return Math.round(total * 0.1 * days);
}
