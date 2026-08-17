// Hook de suivi de la licence de l'appareil. Lit le `expiryDate` du profil boutique
// (IndexedDB) via React Query et en tire un countdown exploitable par le banner et le
// modal de renouvellement.
import { useQuery } from "@tanstack/react-query";
import { getShopProfile } from "@/lib/db";

const DAY_MS = 86_400_000;

export interface SubscriptionInfo {
  /** Jours restants (arrondi au supérieur, 0 si expiré). */
  daysRemaining: number;
  /** `true` si ≤ 7 jours restants ou déjà expiré. */
  isExpiringSoon: boolean;
  /** `true` si le compte est expiré (0 jour restant). */
  isExpired: boolean;
  /** Timestamp de fin de licence (ms). */
  expiryDate: number;
  /** Timestamp d'inscription (ms). */
  registrationDate: number;
}

const FALLBACK: SubscriptionInfo = {
  daysRemaining: 30,
  isExpiringSoon: false,
  isExpired: false,
  expiryDate: Date.now() + 30 * DAY_MS,
  registrationDate: Date.now(),
};

export function useSubscription(): SubscriptionInfo {
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    staleTime: 60_000,
  });

  if (!profile) return FALLBACK;

  const daysRemaining = Math.max(0, Math.ceil((profile.expiryDate - Date.now()) / DAY_MS));
  return {
    daysRemaining,
    isExpiringSoon: daysRemaining <= 7,
    isExpired: daysRemaining <= 0,
    expiryDate: profile.expiryDate,
    registrationDate: profile.registrationDate,
  };
}
