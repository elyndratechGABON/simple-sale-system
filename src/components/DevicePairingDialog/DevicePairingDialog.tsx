// Appairage d'un écran supplémentaire : le QR affiché contient les identifiants du
// compte marchand. La nouvelle caisse le scanne (bouton « Scanner le QR » du mode
// « Rejoindre » à l'onboarding) et rejoint le compte au premier handshake.
//
// L'état vit dans `useDevicePairingDialog`, le QR dans `QRBlock`, l'affichage du code
// temporaire dans `PairingCodeDisplay`, la liste des écrans dans `PairedDevicesPanel`.
import { MonitorSmartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRBlock } from "@/components/pairing/QRBlock";
import { PairingCodeDisplay } from "@/components/pairing/PairingCodeDisplay";
import { PairedDevicesPanel } from "@/components/pairing/PairedDevicesPanel";
import { useDevicePairingDialog } from "./useDevicePairingDialog";

interface DevicePairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevicePairingDialog({ open, onOpenChange }: DevicePairingDialogProps) {
  const d = useDevicePairingDialog(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Ajouter un appareil
          </DialogTitle>
        </DialogHeader>

        {/* Affichage du nombre d'appareils connectés */}
        {d.hasAnyAccount && (
          <div className="mt-2 rounded-lg border p-3 text-left">
            <p className="text-sm font-medium">
              <span>{d.pairedCount} {d.pairedCount === 1 ? "appareil" : "appareils"} connecté(s) </span> /
              <span>{d.quota?.maxDevices ?? "∞"} {d.quota?.maxDevices === 1 ? "écran" : "écrans"}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Le propriétaire dispose de {d.quota?.maxDevices ?? "illimité"} place(s) sur son abonnement.
            </p>
          </div>
        )}

        {d.hasNamePhone ? (
          <QRBlock
            open={open}
            hasNamePhone={d.hasNamePhone}
            identity={d.identity}
            profile={d.profile}
            quota={d.quota}
            localDeviceCount={d.localDeviceCount}
            atCapacity={d.atCapacity}
            isOwner={d.isOwner}
            pairCode={d.pairCode}
            setPairCode={d.setPairCode}
            setCodeExpiry={d.setCodeExpiry}
          />
        ) : d.profile?.accountKeyword ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet écran a rejoint le compte
            <span className="font-medium text-foreground">par mot clé de récupération</span> :
            il n'a pas le téléphone ni le nom du compte, que le QR transporte. Depuis un écran
            qui détient le compte (téléphone + mot de passe), ouvrez ici « Ajouter un appareil »
            pour partager le code QR.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet appareil n'a pas encore d'identité marchande : renseignez le nom de la
            <span className="font-medium text-foreground">boutique</span> et son
            <span className="font-medium text-foreground">téléphone</span> (Réglages → Boutique)
            avant d'afficher un code QR.
          </p>
        )}

        {d.hasAnyAccount && (
          <div className="mt-4 space-y-3 rounded-xl border p-4">
            {d.isOwner && (
              <PairingCodeDisplay pairCode={d.pairCode} minutesLeft={d.minutesLeft} />
            )}

            <PairedDevicesPanel
              isOwner={d.isOwner}
              pending={d.pending}
              paired={d.paired}
              pairedCount={d.pairedCount}
              peers={d.peers}
              identity={d.identity}
              produitsCount={d.produitsCount ?? 0}
              onApprove={d.approve}
              onChangeShare={d.setSharePeer}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}