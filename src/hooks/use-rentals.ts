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
//
// Les formules (unités, total, retard, pénalité) vivent dans `@/lib/rentals` — module PUR,
// source de vérité partagée avec les agrégats de `analytics.ts`. Re-exportées ici pour
// préserver le point d'import des écrans sans dupliquer l'arithmétique.
export { unitsBetween, rentalTotal, overdueDays, lateFee } from "@/lib/rentals";

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
