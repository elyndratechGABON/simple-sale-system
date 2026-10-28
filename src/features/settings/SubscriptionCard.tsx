import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/use-preferences";
import { useAccess } from "@/hooks/use-access";
import { SubscriptionPaymentDialog } from "./SubscriptionPaymentDialog";

/** Carte d'abonnement affichée dans l'onglet Compte (owner uniquement). */
export function SubscriptionCard() {
  const { features } = usePreferences();
  const { role } = useAccess();
  const isOwner = role === "owner";
  const subscriptionFeature = features?.subscription ?? false;

  // Statut simplifié : la feature d'abonnement est un booléen (activée ou non) —
  // les comparaisons à « active » / « trial » ne peuvent jamais matcher.
  const subscriptionStatus = subscriptionFeature ? "Actif" : "Inconnu";

  const [paymentPlan, setPaymentPlan] = useState<{ id: string; name: string; price: number } | null>(null);

  const renderStatusBadge = () => {
    if (subscriptionStatus === "Inconnu") {
      return <Badge variant="secondary">Aucun abonnement détecté</Badge>;
    }
    return (
      <Badge variant={subscriptionStatus === "Actif" ? "default" : "secondary"}>
        {subscriptionStatus}
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