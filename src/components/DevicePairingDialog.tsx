// Appairage d'un écran supplémentaire : le QR affiché contient les identifiants du
// compte marchand. La nouvelle caisse le scanne (bouton « Scanner le QR » du mode
// « Rejoindre » à l'onboarding) et rejoint le compte au premier handshake.
//
// Le QR est généré à la demande (import dynamique de `qrcode`) : rien dans le bundle
// principal, rien en réseau — tout reste local. Le payload embarquant le mot de passe,
// le dialogue le rappelle explicitement : à ne montrer qu'à ses propres appareils.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MonitorSmartphone, QrCode, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { buildPairingPayload } from "@/lib/pairing";
import { getAccountQuota } from "@/lib/gatekeeper";
import { getShopProfile } from "@/lib/db";

interface DevicePairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevicePairingDialog({ open, onOpenChange }: DevicePairingDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    enabled: open,
  });
  const { data: quota } = useQuery({
    queryKey: ["account_quota"],
    queryFn: getAccountQuota,
    enabled: open,
  });

  const hasAccount = Boolean(profile?.accountPhone && profile.accountPassword);
  const atCapacity = quota ? quota.deviceCount >= quota.maxDevices : false;

  // Génération paresseuse : seulement quand le dialogue s'ouvre avec un compte.
  useEffect(() => {
    if (!open || !hasAccount) return;
    let cancelled = false;
    setQrError(false);
    void (async () => {
      try {
        const text = await buildPairingPayload();
        if (!text) throw new Error("no-payload");
        const { default: QRCode } = await import("qrcode");
        const url = await QRCode.toDataURL(text, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hasAccount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Ajouter un appareil
          </DialogTitle>
          <DialogDescription>
            Sur la nouvelle caisse, choisissez « Rejoindre un compte » puis scannez ce code.
          </DialogDescription>
        </DialogHeader>

        {hasAccount ? (
          <div className="space-y-4">
            {quota && (
              <div className="flex items-center justify-between rounded-lg border bg-accent/50 px-3 py-2">
                <span className="text-sm text-muted-foreground">Appareils sur le compte</span>
                <Badge variant={atCapacity ? "destructive" : "secondary"} className="tabular-nums">
                  {quota.deviceCount} / {quota.maxDevices}
                </Badge>
              </div>
            )}

            {atCapacity && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Toutes les places du palier sont prises : le nouvel écran restera bloqué jusqu'à
                libérer une place ou monter de palier.
              </p>
            )}

            <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4">
              {/* Le QR suit la largeur disponible : figé à 224px, il était rogné
                  dans une modale de 300px et moins. */}
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR d'appairage du compte marchand"
                  className="aspect-square h-56 max-w-full rounded-lg object-contain"
                />
              ) : qrError ? (
                <p className="text-sm text-muted-foreground py-16">
                  Impossible de générer le code QR.
                </p>
              ) : (
                <div className="flex aspect-square h-56 w-full max-w-[224px] items-center justify-center rounded-lg border border-dashed">
                  <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Ce code contient les accès au compte{" "}
                <span className="font-medium text-foreground">{profile?.accountName}</span> (
                {profile?.accountPhone}). Ne le montrez qu'à vos propres appareils.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Sans caméra sur l'autre écran ? Saisissez-y manuellement le téléphone du compte et son
              mot de passe — mêmes champs, même effet.
            </p>
          </div>
        ) : profile?.accountKeyword ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet écran a rejoint le compte{" "}
            <span className="font-medium text-foreground">par mot clé de récupération</span> : il
            n'a pas le téléphone ni le mot de passe du compte, que le QR transporte. Pour ajouter
            une autre caisse, communiquez-le lui le mot clé reçu à la création (Paramètres →
            Appareils → « Téléphone perdu, ou plus de mot de passe ? »).
          </p>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Aucun compte marchand sur cet appareil : créez-en un ou rejoignez-le depuis l'assistant
            de premier lancement avant d'ajouter un écran.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
