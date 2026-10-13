import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CreditCard, Wifi } from "lucide-react";
import { getShopProfile } from "@/lib/db";
import { PlanChooser } from "@/components/PlanChooser";
import { PaymentModal } from "@/components/PaymentModal";
import type { PlanInfo } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/format";

/**
 * Abonnement : licence actuelle (validité, fin d'abonnement, dernière synchro) et
 * changement de plan. Regroupé ici avec la carte « Appareils » — la vie du compte
 * marchand, pas celle de la boutique.
 */
const DAY_MS = 86_400_000;

function daysLeft(expiryDate: number): number {
  return Math.max(0, Math.ceil((expiryDate - Date.now()) / DAY_MS));
}

export function SubscriptionCard() {
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    staleTime: 60_000,
  });
  const [planChooserOpen, setPlanChooserOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);

  if (!profile) return null;

  const left = daysLeft(profile.expiryDate);
  const expired = left <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" /> Abonnement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Badge variant={expired ? "destructive" : "default"} className="mt-0.5">
            {expired ? "Expiré" : `Licence · ${left} j`}
          </Badge>
          <p className="text-sm text-muted-foreground">
            Inscrit le {formatDateShort(profile.registrationDate)} · jusqu'au{" "}
            {formatDateShort(profile.expiryDate)}
          </p>
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
