import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePreferences } from "@/hooks/use-preferences";
import { useAccess } from "@/hooks/use-access";
import { SubscriptionPaymentDialog } from "./SubscriptionPaymentDialog";

/** Carte d'abonnement affichée dans l'onglet Compte (owner uniquement). */
export function SubscriptionCard() {
  const { features } = usePreferences();
  const { role } = useAccess();
  const isOwner = role === "owner";
  const subscriptionFeature = features?.subscription ?? false;

  // Statut simplifié : on utilise la présence/features pour déterminer l'état
  const subscriptionStatus = subscriptionFeature
    ? features.subscription === "active"
      ? "Actif"
      : features.subscription === "trial"
        ? "Essai"
        : "Expiré"
    : "Inconnu";

  const [open, setOpen] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
  };

  const renderStatusBadge = () => {
    if (subscriptionStatus === "Inconnu") {
      return <Badge variant="secondary">Aucun abonnement détecté</Badge>;
    }
    return (
      <Badge variant={subscriptionStatus === "Actif" ? "default" : subscriptionStatus === "Essai" ? "warning" : "destructive"}>
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
    setShowPaymentDialog(true);
  };

  const handlePaymentDialogClose = () => {
    setShowPaymentDialog(false);
  };

  if (!isOwner) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">Abonnement</h3>
        {renderStatusBadge()}
      </div>

      {/* Boutons selon le statut */}
      {subscriptionStatus === "Essai" && (
        <div>
          <Button
            onClick={() => openPaymentDialog("essentiel")}
            className="w-full"
          >
            Payer l'abonnement
          </Button>
          {showPaymentDialog && (
            <SubscriptionPaymentDialog
              isOpen={showPaymentDialog}
              onClose={handlePaymentDialogClose}
              plan={plans.essentiel}
            />
          )}
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
          {showPaymentDialog && (
            <>
              {plans.confort.id === "confort" && (
                <SubscriptionPaymentDialog
                  isOpen={showPaymentDialog}
                  onClose={handlePaymentDialogClose}
                  plan={plans.confort}
                />
              )}
              {plans.affluence.id === "affluence" && (
                <SubscriptionPaymentDialog
                  isOpen={showPaymentDialog}
                  onClose={handlePaymentDialogClose}
                  plan={plans.affluence}
                />
              )}
            </>
          )}
        </div>
      )}

      {subscriptionStatus === "Expiré" && (
        <p className="text-sm text-muted-foreground">
          Votre abonnement a expiré. Renouvelez pour continuer d'utiliser toutes les fonctionnalités.
        </p>
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