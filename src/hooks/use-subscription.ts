// Hook de suivi de la licence de l'appareil. Lit le `expiryDate` du profil boutique
// (IndexedDB) via React Query et en tire un countdown exploitable par le banner et le
// modal de renouvellement. Intègre la grace period (2 jours post-expiration).
import { useQuery } from "@tanstack/react-query";
import { getShopProfile } from "@/lib/db";
import { getGraceEndsAt } from "@/lib/gatekeeper";

const DAY_MS = 86_400_000;

export interface SubscriptionInfo {
  /** Jours restants avant expiration (arrondi au supérieur, 0 si expiré). */
  daysRemaining: number;
  /** `true` si ≤ 7 jours restants ou déjà expiré (inclut la grace). */
  isExpiringSoon: boolean;
  /** `true` si le compte est expiré (0 jour restant). */
  isExpired: boolean;
  /** `true` si le serveur a signalé une grace period active. */
  isInGrace: boolean;
  /** Timestamp de fin de la grace period (ms). Null si pas en grace. */
  graceEndsAt: number | null;
  /** Heures restantes dans la grace period (arrondi au supérieur). 0 si pas en grace. */
  graceHoursRemaining: number;
  /** Timestamp de fin de licence (ms). */
  expiryDate: number;
  /** Timestamp d'inscription (ms). */
  registrationDate: number;
}

const FALLBACK: SubscriptionInfo = {
  daysRemaining: 30,
  isExpiringSoon: false,
  isExpired: false,
  isInGrace: false,
  graceEndsAt: null,
  graceHoursRemaining: 0,
  expiryDate: Date.now() + 30 * DAY_MS,
  registrationDate: Date.now(),
};

export function useSubscription(): SubscriptionInfo {
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    staleTime: 60_000,
  });

  const { data: graceEndsAt } = useQuery({
    queryKey: ["grace_ends_at"],
    queryFn: getGraceEndsAt,
    staleTime: 60_000,
  });

  if (!profile) return FALLBACK;

  const now = Date.now();
  const daysRemaining = Math.max(0, Math.ceil((profile.expiryDate - now) / DAY_MS));
  const isExpired = daysRemaining <= 0;

  // Grace period : le serveur a renvoyé grace_ends_at et la date est dans le futur.
  const isInGrace = Boolean(graceEndsAt && graceEndsAt > now);
  const graceHoursRemaining = isInGrace
    ? Math.max(0, Math.ceil((graceEndsAt! - now) / (DAY_MS / 24)))
    : 0;

  return {
    daysRemaining,
    // Le banner s'affiche si expiring soon OU en grace (même si expiryDate est dépassé).
    isExpiringSoon: daysRemaining <= 7 || isInGrace,
    isExpired,
    isInGrace,
    graceEndsAt: graceEndsAt ?? null,
    graceHoursRemaining,
    expiryDate: profile.expiryDate,
    registrationDate: profile.registrationDate,
  };
}
