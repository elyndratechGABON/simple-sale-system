// Hook React Query pour les locations d'actifs (cluster 'location').
// Fournit CRUD + queries pour la disponibilité et le statut des locations.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRental,
  updateRental,
  getRental,
  listActiveRentals,
  listOverdueRentals,
  listAllRentals,
  getAssetAvailability,
  markOverdueRentals,
  type Rental,
} from "@/lib/db";

// ── Queries ─────────────────────────────────────────────────────────────────────

/** Liste des locations actives, triées par date de fin prévue. */
export function useActiveRentals() {
  return useQuery({
    queryKey: ["rentals", "active"],
    queryFn: listActiveRentals,
    staleTime: 30_000,
  });
}

/** Liste des locations en retard. */
export function useOverdueRentals() {
  return useQuery({
    queryKey: ["rentals", "overdue"],
    queryFn: listOverdueRentals,
    staleTime: 30_000,
  });
}

/** Toutes les locations (historique). */
export function useAllRentals() {
  return useQuery({
    queryKey: ["rentals", "all"],
    queryFn: listAllRentals,
    staleTime: 30_000,
  });
}

/** Détail d'une location. */
export function useRental(id: string | null) {
  return useQuery({
    queryKey: ["rental", id],
    queryFn: () => (id ? getRental(id) : undefined),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Disponibilité d'un actif sur une période. */
export function useAssetAvailability(assetId: string | null, startDate: number, endDate: number) {
  return useQuery({
    queryKey: ["availability", assetId, startDate, endDate],
    queryFn: () => (assetId ? getAssetAvailability(assetId, startDate, endDate) : null),
    enabled: !!assetId && endDate > startDate,
    staleTime: 10_000,
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────────

/** Créer une nouvelle location. Invalide les queries actives + all. */
export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: Omit<Rental, "id" | "created_at" | "updated_at">) => addRental(r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

/** Mettre à jour une location (retour, annulation, etc.). */
export function useUpdateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: Rental) => updateRental(r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

// ── Utilitaires métier ──────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Calcule le nombre d'unités de temps entre deux dates selon l'unité de tarification. */
export function unitsBetween(start: number, end: number, unit: Rental["pricing_unit"]): number {
  const ms = end - start;
  switch (unit) {
    case "hour":
      return Math.ceil(ms / HOUR_MS);
    case "day":
      return Math.ceil(ms / DAY_MS);
    case "week":
      return Math.ceil(ms / (7 * DAY_MS));
    case "month":
      return Math.ceil(ms / (30 * DAY_MS));
  }
}

/** Calcule le coût total d'une location. */
export function rentalTotal(
  pricePerUnit: number,
  quantity: number,
  start: number,
  end: number,
  unit: Rental["pricing_unit"],
): number {
  return pricePerUnit * quantity * unitsBetween(start, end, unit);
}

/** Calcule les jours de retard (0 si pas en retard). */
export function overdueDays(expectedEnd: number): number {
  const now = Date.now();
  if (now <= expectedEnd) return 0;
  return Math.ceil((now - expectedEnd) / DAY_MS);
}

/** Calcule la pénalité de retard (10% du total par jour de retard). */
export function lateFee(total: number, expectedEnd: number): number {
  const days = overdueDays(expectedEnd);
  return Math.round(total * 0.1 * days);
}

/** Met à jour le statut des locations en retard. À appeler au démarrage de l'app. */
export function useMarkOverdueRentals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markOverdueRentals,
    onSuccess: (count) => {
      if (count > 0) {
        qc.invalidateQueries({ queryKey: ["rentals"] });
      }
    },
  });
}
