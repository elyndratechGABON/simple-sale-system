// QR d'appairage ÉPURÉ (mission UI) : le QR occupe la place, le gros code de session
// et son bouton Copier juste dessous, une seule phrase de consigne. Tout autre texte
// est sorti — l'écran du patron reste lisible pendant le service. La seule alerte
// conservée : le palier complet, qui bloque réellement la connexion.
import { Copy, QrCode, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { ShopProfile } from "@/lib/db";
import type { SyncIdentity } from "@/lib/syncengine/types";
import { Button } from "@/components/ui/button";
import { useQrPayload } from "./useQrPayload";

interface QRBlockProps {
  open: boolean;
  hasNamePhone: boolean;
  identity: SyncIdentity | undefined;
  profile: ShopProfile | null | undefined;
  atCapacity: boolean;
  pairCode: string | null;
  setPairCode: (value: string | null) => void;
  setCodeExpiry: (value: number | null) => void;
  minutesLeft: number;
}

export function QRBlock({
  open,
  hasNamePhone,
  identity,
  profile,
  atCapacity,
  pairCode,
  setPairCode,
  setCodeExpiry,
  minutesLeft,
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

  function copy() {
    if (!pairCode) return;
    void navigator.clipboard.writeText(pairCode).then(() => toast.success("Code copié"));
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {atCapacity && (
        <p className="flex w-full items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Toutes les places du palier sont prises : libérez une place pour qu'un appareil rejoigne.
        </p>
      )}

      {qrError ? (
        <div className="px-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Relais injoignable : aucun QR ne peut être émis. Revenez quand le réseau est disponible.
          </p>
          {qrErrorDetail && <p className="mt-2 text-xs text-amber-600">{qrErrorDetail}</p>}
        </div>
      ) : qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt="QR d'appairage du compte marchand"
          className="aspect-square w-72 rounded-lg object-contain"
        />
      ) : (
        <div className="flex aspect-square w-72 items-center justify-center rounded-lg border border-dashed">
          <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
        </div>
      )}

      {pairCode && (
        <div className="flex w-full flex-col items-center gap-2">
          {/* Le code de session, TRÈS CLAIR : c'est ce que l'employé FRAPPE à la main
              quand le scan échoue (repli manuel de l'écran de scan). */}
          <p className="font-mono text-4xl font-bold tracking-widest tabular-nums">{pairCode}</p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="h-4 w-4 mr-1.5" /> Copier
            </Button>
            {minutesLeft > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {minutesLeft} min restants
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Scannez ce code ou saisissez-le sur la caisse employé.
      </p>

      {/* En attente (mission feedback patron) : une pulsation discrète sous la
          consigne — l'écran dit qu'il VIT, sans alerter sur un rien. */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        En attente de connexion…
      </div>
    </div>
  );
}
