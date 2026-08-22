import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlanCard, PLANS, type PlanInfo } from "@/components/SubscriptionPlanCard";

interface PlanChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (plan: PlanInfo) => void;
}

export function PlanChooser({ open, onOpenChange, onSelect }: PlanChooserProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-1 sm:text-center">
          <img
            src="/subscription-choice.webp"
            alt="ELYNDRA CAISSE — abonnement"
            width={1312}
            height={1199}
            className="h-24 w-auto mx-auto rounded-lg"
          />
          <DialogTitle className="text-2xl">Choisissez votre abonnement</DialogTitle>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            30 jours d'essai gratuit inclus · Sans engagement · Payez par Airtel Money
          </p>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={(p) => {
                onOpenChange(false);
                onSelect(p);
              }}
            />
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Tous les plans incluent l'accès complet à la caisse. Vous pouvez changer de plan à tout
          moment depuis les paramètres.
        </p>
      </DialogContent>
    </Dialog>
  );
}
