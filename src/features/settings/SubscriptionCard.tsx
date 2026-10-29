import { useState } from "react";
import { Circle, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/use-preferences";
import { useAccess } from "@/hooks/use-access";
import { useSubscription } from "@/hooks/use-subscription";
import { formatFCFA } from "@/lib/format";
import { SubscriptionPaymentDialog } from "./SubscriptionPaymentDialog";

/** Paliers proposés à l'abonnement : ceux d'Elyndra (« Prolonger »/console admin). */
const PLANS = [
  { id: "essentiel", name: "Essentiel", price: 10000, devices: 3 },
  { id: "confort", name: "Confort", price: 25000, devices: 5 },
  { id: "affluence", name: "Affluence", price: 50000, devices: 9 },
] as const;

type Plan = (typeof PLANS)[number];

/** Carte d'abonnement affichée dans l'onglet Compte (owner uniquement). */
export function SubscriptionCard() {
  const { features } = usePreferences();
  const { role } = useAccess();
  const { isExpired, daysRemaining } = useSubscription();
  const isOwner = role === "owner";
  const subscriptionFeature = features?.subscription ?? false;

  // Statut réel lu dans la licence : activé ⇢ Actif ; essai (jours restants) ⇢ Essai ;
  // échéance dépassée ⇢ Expiré. Les paliers qui ne colleraient pas retombent sur Expiré.
  const subscriptionStatus = subscriptionFeature
    ? "Actif"
    : isExpired
      ? "Expiré"
      : daysRemaining > 0
        ? "Essai"
        : "Expiré";

  // Le palier est choisi AVANT le dialogue : trois lignes radio-style, et le CTA lance
  // le paiement du palier coché — plus de trois boutons à trois destinations.
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[0]);
  const [paymentPlan, setPaymentPlan] = useState<Plan | null>(null);

  if (!isOwner) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Abonnement</h3>
        <Badge
          variant={
            subscriptionStatus === "Actif"
              ? "default"
              : subscriptionStatus === "Essai"
                ? "secondary"
                : "destructive"
          }
        >
          {subscriptionStatus === "Essai"
            ? `Essai — ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}`
            : subscriptionStatus}
        </Badge>
      </div>

      <Button onClick={() => setPaymentPlan(selectedPlan)} className="w-full">
        {subscriptionStatus === "Actif"
          ? `Renouveler — ${selectedPlan.name}`
          : "Payer l'abonnement"}
      </Button>

      {/* Sélecteur de palier sous le CTA, radio-style : le commerçant coche son palier
          (Essentiel 10 000, Confort 25 000, Affluence 50 000) puis lance le paiement. */}
      <div role="radiogroup" aria-label="Choisir un palier" className="space-y-2">
        {PLANS.map((plan) => {
          const active = plan.id === selectedPlan.id;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelectedPlan(plan)}
              className={
                active
                  ? "flex w-full flex-col items-start gap-0.5 rounded-lg border border-primary bg-primary/5 px-3 py-2 text-left transition-colors"
                  : "w-full rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/50"
              }
            >
              <span className="flex w-full items-center gap-2">
                {active ? (
                  <CircleDot className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{plan.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatFCFA(plan.price)}
                </span>
              </span>
              <span className="pl-6 text-xs text-muted-foreground">{plan.devices} appareils</span>
            </button>
          );
        })}
      </div>

      {/* Un seul dialog de paiement, celui du palier choisi */}
      {paymentPlan && (
        <SubscriptionPaymentDialog isOpen onClose={() => setPaymentPlan(null)} plan={paymentPlan} />
      )}

      {/* État par défaut */}
      {!subscriptionFeature && (
        <p className="text-sm text-muted-foreground">
          Aucun abonnement n'est actuellement actif. Passez à un palier supérieur ou commencez un
          essai.
        </p>
      )}
    </div>
  );
}
