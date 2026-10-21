import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CreditCard, Wifi } from "lucide-react";
import { getShopProfile } from "@/lib/db";
import { getAccountQuota } from "@/lib/gatekeeper";
import { PlanChooser } from "@/components/PlanChooser";
import { PaymentModal } from "@/components/PaymentModal";
import { useSubscription } from "@/hooks/use-subscription";
import type { PlanInfo } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/format";

/**
 * Abonnement : où en est le commerce, et comment changer de plan quand il le faut.
 *
 * Le commerçant doit lire en un coup d'œil :
 *  - s'il est en ESSAI (et combien de temps il lui reste) ou ABONNÉ (et jusqu'à
 *    quand) ;
 *  - quel palier il a, et combien de places ;
 *  - que l'échéance approche, ou que la période de grâce court.
 *
 * Le changement de plan passe par le sélecteur (PlanChooser) puis le paiement
 * (PaymentModal) : c'est le même chemin que le bandeau de renouvellement.
 */
export function SubscriptionCard() {
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    staleTime: 60_000,
  });
  const { data: quota } = useQuery({
    queryKey: ["account_quota"],
    queryFn: getAccountQuota,
    staleTime: 60_000,
  });
  const { daysRemaining, isExpired, isInGrace, graceHoursRemaining } = useSubscription();
  const [planChooserOpen, setPlanChooserOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);

  if (!profile) return null;

  // L'état affiché : essai (jamais payé) ou abonnement, et la grâce le cas échéant.
  const essai = quota?.trial === true;
  const plan = quota?.planName ?? null;
  const places = quota ? `${quota.deviceCount}/${quota.maxDevices}` : null;

  let badge = "Abonnement";
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
  let detail = `Jusqu'au ${formatDateShort(profile.expiryDate)}`;

  if (isInGrace) {
    badge = `Grâce · ${graceHoursRemaining} h`;
    badgeVariant = "destructive";
    detail = `Abonnement échu le ${formatDateShort(profile.expiryDate)} — la caisse fonctionne encore, mais la synchronisation s'arrête à la fin de la grâce.`;
  } else if (isExpired) {
    badge = "Expiré";
    badgeVariant = "destructive";
    detail = `L'échéance du ${formatDateShort(profile.expiryDate)} est passée. La caisse est bloquée : renouvelez pour repartir.`;
  } else if (essai) {
    badge = `Essai · ${daysRemaining} j`;
    badgeVariant = "secondary";
    detail = `Votre période d'essai se termine le ${formatDateShort(profile.expiryDate)}. Un abonnement la prolongera.`;
  } else if (daysRemaining <= 7) {
    badge = `Expire dans ${daysRemaining} j`;
    badgeVariant = "outline";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" /> Abonnement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Badge variant={badgeVariant} className="mt-0.5">
            {badge}
          </Badge>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {plan && <span className="font-medium text-foreground">{plan}</span>}
          {places && <span>· {places} écrans</span>}
          <span>· Inscrit le {formatDateShort(profile.registrationDate)}</span>
        </div>

        {profile.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Dernière synchronisation :{" "}
            {new Date(profile.lastSyncedAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        <div className="rounded-xl border bg-muted/30 p-3">
          <Button variant="outline" onClick={() => setPlanChooserOpen(true)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Changer de plan
          </Button>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            Synchronisation automatique avec l'orchestrateur. Hors ligne, la caisse fonctionne
            normalement.
          </p>
        </div>
      </CardContent>

      <PlanChooser
        open={planChooserOpen}
        onOpenChange={setPlanChooserOpen}
        onSelect={(plan) => {
          setSelectedPlan(plan);
          setPaymentOpen(true);
        }}
      />
      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        storeName={profile.storeName}
        ownerName={profile.ownerName}
        selectedPlan={selectedPlan}
      />
    </Card>
  );
}
