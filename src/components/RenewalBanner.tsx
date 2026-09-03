// Bandeau de countdown affiché quand la licence approche de l'échéance (≤ 7 jours)
// ou est en grace period (2 jours post-expiration).
// Cliquable : ouvre le sélecteur de plan. Disparaît une fois la licence prolongée.
//
// Intégré dans _app.tsx, juste sous l'en-tête, pour être visible quel que soit l'écran.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { getShopProfile } from "@/lib/db";
import { useSubscription } from "@/hooks/use-subscription";
import { PlanChooser } from "@/components/PlanChooser";
import { PaymentModal } from "@/components/PaymentModal";
import { cn } from "@/lib/utils";
import type { PlanInfo } from "@/lib/pricing";

export function RenewalBanner() {
  const { isExpiringSoon, isExpired, isInGrace, daysRemaining, graceHoursRemaining } =
    useSubscription();
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
  });
  const [planChooserOpen, setPlanChooserOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);

  if (!isExpiringSoon || !profile) return null;

  function handleSelectPlan(plan: PlanInfo) {
    setSelectedPlan(plan);
    setPaymentOpen(true);
  }

  // Détermination du style et du message selon la gravité.
  const isCritical = isInGrace || isExpired;
  const isUrgent = !isCritical && daysRemaining <= 3;

  return (
    <>
      <button
        type="button"
        onClick={() => setPlanChooserOpen(true)}
        className={cn(
          "w-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
          isCritical
            ? "bg-destructive/10 text-destructive hover:bg-destructive/15 animate-pulse"
            : isUrgent
              ? "bg-orange-500/10 text-orange-700 hover:bg-orange-500/15 dark:text-orange-400"
              : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400",
        )}
      >
        {isInGrace ? (
          <>
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Grace period —{" "}
              <span className="font-bold">
                {graceHoursRemaining}h{graceHoursRemaining > 1 ? "" : ""} restante
                {graceHoursRemaining > 1 ? "s" : ""}
              </span>{" "}
              avant coupure — choisir un plan
            </span>
          </>
        ) : isExpired ? (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Abonnement expiré — choisissez un plan pour continuer</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Expire dans <span className="font-bold">J-{daysRemaining}</span> — choisir un plan
            </span>
          </>
        )}
      </button>

      <PlanChooser
        open={planChooserOpen}
        onOpenChange={setPlanChooserOpen}
        onSelect={handleSelectPlan}
      />

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        storeName={profile.storeName}
        ownerName={profile.ownerName}
        selectedPlan={selectedPlan}
      />
    </>
  );
}
