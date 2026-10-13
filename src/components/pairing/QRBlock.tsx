import { QrCode, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPreferences } from "@/lib/settings";
import type { ShopProfile } from "@/lib/db";
import type { AccountQuota } from "@/lib/gatekeeper";
import type { SyncIdentity } from "@/lib/syncengine/types";
import { useQrPayload } from "./useQrPayload";

interface QRBlockProps {
  open: boolean;
  hasNamePhone: boolean;
  identity: SyncIdentity | undefined;
  profile: ShopProfile | null | undefined;
  quota: AccountQuota | null | undefined;
  localDeviceCount: number;
  atCapacity: boolean;
  isOwner: boolean;
  pairCode: string | null;
  setPairCode: (value: string | null) => void;
  setCodeExpiry: (value: number | null) => void;
}

export function QRBlock({
  open,
  hasNamePhone,
  identity,
  profile,
  quota,
  localDeviceCount,
  atCapacity,
  isOwner,
  pairCode,
  setPairCode,
  setCodeExpiry,
}: QRBlockProps) {
  const { qrDataUrl, qrError, qrErrorDetail } = useQrPayload({
    open,
    hasNamePhone,
    identity,
    profile,
    pairCode,
    setPairCode,
    setCodeExpiry,
  });

  return (
    <div className="space-y-4">
      {quota && (
        <div className="space-y-1 rounded-lg border bg-accent/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Appareils sur le compte</span>
            <Badge variant={atCapacity ? "destructive" : "secondary"} className="tabular-nums">
              {localDeviceCount} / {quota.maxDevices}
            </Badge>
          </div>
          {/* Le compteur local est instantané (1 écran + pairs approuvés) ; celui du
              serveur fait foi et peut le dépasser — un écran connu ailleurs, pas
              encore appairé ici. L'afficher évite « 1 / 3 » pendant que le serveur
              dit « 3 / 3 ». */}
          {quota.deviceCount > localDeviceCount && (
            <p className="text-xs text-muted-foreground">
              {quota.deviceCount} écran{quota.deviceCount > 1 ? "s" : ""} côté serveur — certains
              écrans de ce compte ne sont pas encore appairés ici.
            </p>
          )}
        </div>
      )}

      {atCapacity && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Toutes les places du palier sont prises : le nouvel écran restera bloqué jusqu'à libérer
          une place ou monter de palier.
        </p>
      )}

      {isOwner && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="text-sm font-medium text-foreground">Appareil employé</p>
          <p className="text-xs text-muted-foreground">
            Le code QR est destiné à un employé — le rôle « employé » est inscrit automatiquement.
            Aucune sélection n'est nécessaire.
          </p>
        </div>
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
          <div className="px-2 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Relais injoignable : aucun QR ne peut être émis. Le mot de passe n'est jamais envoyé
              dans un QR — revenez quand le réseau est disponible.
            </p>
            {qrErrorDetail && <p className="mt-2 text-xs text-amber-600">{qrErrorDetail}</p>}
          </div>
        ) : (
          <div className="flex aspect-square h-56 w-full max-w-[224px] items-center justify-center rounded-lg border border-dashed">
            <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Ce code donne l'accès à la boutique{" "}
          <span className="font-medium text-foreground">
            {getPreferences().workspaceName || profile?.storeName || profile?.accountName}
          </span>{" "}
          ({profile?.accountPhone || profile?.phone}). L'employé le scanne, entre son nom, et reçoit
          le stock, les ventes et la caisse via le relais. Ne le montrez qu'à vos propres appareils.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Ce QR ne contient aucun mot de passe : un jeton de partage + le code temporaire. Sur son
        écran, l'employé saisit son nom puis le mot de passe temporaire ci-dessous.
      </p>
    </div>
  );
}
