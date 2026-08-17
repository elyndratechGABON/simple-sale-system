// Bandeau de countdown affiché quand la licence approche de l'échéance (≤ 7 jours).
// Cliquable : ouvre le modal de renouvellement. Disparaît une fois la licence prolongée.
//
// Intégré dans _app.tsx, juste sous l'en-tête, pour être visible quel que soit l'écran.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { getShopProfile } from "@/lib/db";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentModal } from "@/components/PaymentModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RenewalBanner() {
  const { isExpiringSoon, isExpired, daysRemaining } = useSubscription();
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
  });
  const [modalOpen, setModalOpen] = useState(false);

  if (!isExpiringSoon || !profile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "w-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
          isExpired
            ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
            : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400",
        )}
      >
        {isExpired ? (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Abonnement expiré — renouvelez pour continuer à utiliser la caisse
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 shrink-0" />
            Votre abonnement expire dans{" "}
            <span className="font-bold">
              {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
            </span>
            {" — "}
            Renouvelez maintenant
          </>
        )}
      </button>

      <PaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        storeName={profile.storeName}
        ownerName={profile.ownerName}
      />
    </>
  );
}
