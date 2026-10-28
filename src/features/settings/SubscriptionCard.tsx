import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/use-preferences";
import { useAccess } from "@/hooks/use-access";
import { useSubscription } from "@/hooks/use-subscription";
import { formatFCFA } from "@/lib/format";
import { SubscriptionPaymentDialog } from "./SubscriptionPaymentDialog";

/** Carte d'abonnement affichée dans l'onglet Compte (owner uniquement). */
export function SubscriptionCard() {
  const { features } = usePreferences();
  const { role } = useAccess();
  const { isExpired, daysRemaining } = useSubscription();
  const isOwner = role === "owner";
  const subscriptionFeature = features?.subscription ?? false;

  // Statut réel lu dans la licence : activé → Actif ; essai (jours restants) → Essai ;
  // échéance dépassée → Expiré. Les paliers qui ne colleraient pas retombent sur Expiré.
  const subscriptionStatus = subscriptionFeature
    ? "Actif"
    : isExpired
      ? "Expiré"
      : daysRemaining > 0
        ? "Essai"
        : "Expiré";

  const [paymentPlan, setPaymentPlan] = useState<{ id: string; name: string; price: number } | null>(null);

  const renderStatusBadge = () => {
    return (
      <Badge variant={subscriptionStatus === "Actif" ? "default" : subscriptionStatus === "Essai" ? "secondary" : "destructive"}>
        {subscriptionStatus === "Essai" ? `Essai — ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}` : subscriptionStatus}
      </Badge>
    );
  };

  const plans = {
    essentiel: { id: "essentiel", name: "Essentiel", price: 10000 },
    confort: { id: "confort", name: "Confort", price: 25000 },
    affluence: { id: "affluence", name: "Affluence", price: 50000 },
  };

  const openPaymentDialog = (planKey: keyof typeof plans) => {
    setPaymentPlan(plans[planKey]);
  };

  const handlePaymentDialogClose = () => {
    setPaymentPlan(null);
  };

  if (!isOwner) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">Abonnement</h3>
        {renderStatusBadge()}
      </div>

      {/* Boutons selon le statut */}
      {/* Pas d'abonnement actif : proposer le paiement */}
      {!subscriptionFeature && (
        <div>
          <Button
            onClick={() => openPaymentDialog("essentiel")}
            className="w-full"
          >
            Payer l'abonnement
          </Button>
        </div>
      )}

      {subscriptionStatus === "Actif" && (
        <div className="space-y-2">
          <Button
            onClick={() => openPaymentDialog("confort")}
            className="w-full"
          >
            Renouveler
          </Button>
          <Button
            variant="outline"
            onClick={() => openPaymentDialog("affluence")}
            className="w-full"
          >
            Changer d'abonnement
          </Button>
        </div>
      )}

      {/* Un seul dialog de paiement, celui du palier choisi */}
      {paymentPlan && (
        <SubscriptionPaymentDialog
          isOpen
          onClose={handlePaymentDialogClose}
          plan={paymentPlan}
        />
      )}

      {/* État par défaut */}
      {!subscriptionFeature && (
        <p className="text-sm text-muted-foreground">
          Aucun abonnement n'est actuellement actif. Passez à un palier supérieur ou commencez un essai.
        </p>
      )}
    </div>
  );
}