import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, MonitorSmartphone, QrCode, Store } from "lucide-react";
import {
  clearPaymentConfirmationPending,
  getPaymentConfirmationPending,
  type PaymentConfirmation,
} from "@/lib/payment-confirmation";
import { getAccountQuota, getSubscriptionRequest } from "@/lib/gatekeeper";
import { getShopProfile } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { DevicePairingDialog } from "@/components/DevicePairingDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncedDevices } from "./SyncedDevices";

/**
 * Appareils du compte marchand : quota renvoyé par le dernier handshake et QR
 * d'appairage pour rattacher un nouvel écran. Le bouton ouvre toujours le dialogue
 * « Ajouter un appareil » — l'écran n'a besoin que de l'identité marchande
 * (téléphone + nom de la boutique) pour émettre le QR, sans détenir le mot de passe.
 */
export function DevicesCard() {
  const [pairingOpen, setPairingOpen] = useState(false);
  // Drapeau one-shot « paiement confirmé » : posé au dépôt de la demande, consommé
  // uniquement après la validation serveur (`approved`) pour ouvrir WhatsApp.
  const [paymentPending, setPaymentPending] = useState<PaymentConfirmation | null>(() =>
    getPaymentConfirmationPending(),
  );
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
  const { data: request } = useQuery({
    queryKey: ["subscription_request"],
    queryFn: getSubscriptionRequest,
    staleTime: 60_000,
  });
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    staleTime: 60_000,
  });
  const { data: peers } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    staleTime: 60_000,
    enabled: Boolean(identity),
  });

  // Demande refusée = paiement douteux (ou jamais reçu) : aucun message « paiement
  // effectué » ne doit jamais partir, et le drapeau est purgé pour ne pas resservir.
  useEffect(() => {
    if (request?.status === "rejected" && paymentPending) {
      clearPaymentConfirmationPending();
      setPaymentPending(null);
    }
  }, [request?.status, paymentPending]);

  const hasAccount = Boolean(profile?.accountPhone && profile.accountPassword);

  // Crédit d'écrans LOCAL (offline-first) : 1 = cet écran + les écrans `paired` du groupe.
  // L'approuvé compte dès qu'il est sur le téléphone du propriétaire ; l'orchestrateur ne
  // fait que confirmer derrière (rattachement serveur), sans être requis pour le compteur.
  const localDeviceCount = 1 + (peers ?? []).filter((p) => p.status === "paired").length;

  // Afficher/masquer le mot de passe du compte dans la fiche « Compte marchand ».
  const [showAccountPassword, setShowAccountPassword] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4" /> Appareils
        </CardTitle>
        <CardDescription>
          Partager votre abonnement entre plusieurs caisses : l'une montre le code QR, les autres le
          scannent depuis l'écran « Rejoindre via code QR ».
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border bg-accent/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">Places utilisées</span>
          <Badge
            variant={quota && localDeviceCount >= quota.maxDevices ? "destructive" : "secondary"}
            className="tabular-nums"
          >
            {localDeviceCount} / {quota?.maxDevices ?? "—"}
          </Badge>
        </div>

        {/* Fiche du compte marchand : affichée dès qu'on détient les identifiants
              (créés à l'onboarding ou rattachés). Rend visibles les informations que
              la saisie initiale a posées, pour vérifier avant de partager l'appareil. */}
        {hasAccount && (
          <div className="space-y-2 rounded-xl border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Store className="h-4 w-4" /> Compte marchand
            </p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Nom du compte</dt>
                <dd className="text-right font-medium">
                  {profile?.accountName || profile?.storeName || "—"}
                </dd>
              </div>
              {profile?.ownerName && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Propriétaire</dt>
                  <dd className="text-right">{profile.ownerName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Téléphone</dt>
                <dd className="text-right font-mono">{profile?.accountPhone}</dd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <dt className="text-muted-foreground">Mot de passe</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono">
                    {showAccountPassword ? profile?.accountPassword : "••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAccountPassword((v) => !v)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      showAccountPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                  >
                    {showAccountPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Ces identifiants servent au partage entre vos caisses : scannez-leur le QR
              d'appairage, ou saisissez-leur ce téléphone et ce mot de passe.
            </p>
          </div>
        )}

        {identity && <SyncedDevices peers={peers ?? []} />}

        <Button onClick={() => setPairingOpen(true)}>
          <QrCode className="h-4 w-4 mr-2" />
          {hasAccount ? "Ajouter un appareil" : "Rejoindre un compte"}
        </Button>
      </CardContent>

      <DevicePairingDialog open={pairingOpen} onOpenChange={setPairingOpen} />
    </Card>
  );
}
