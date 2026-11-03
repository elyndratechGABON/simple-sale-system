// Appairage d'un écran supplémentaire : le QR affiché contient les identifiants du
// compte marchand. La nouvelle caisse le scanne (bouton « Scanner le QR » du mode
// « Rejoindre » à l'onboarding) et rejoint le compte au premier handshake.
//
// ÉPURÉ (mission UI) : compteurs et explications sortis — le QR, le code âgé
// et sa consigne tiennent la modale. La liste des écrans (PairedDevicesPanel) reste :
// c'est là que le patron approuve. L'état vit dans `useDevicePairingDialog`.
import { MonitorSmartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRBlock } from "@/components/pairing/QRBlock";
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

        {d.hasNamePhone ? (
          <>
            <QRBlock
              open={open}
              hasNamePhone={d.hasNamePhone}
              identity={d.identity}
              profile={d.profile}
              atCapacity={d.atCapacity}
              pairCode={d.pairCode}
              setPairCode={d.setPairCode}
              setCodeExpiry={d.setCodeExpiry}
              minutesLeft={d.minutesLeft}
            />
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
          </>
        ) : d.profile?.accountKeyword ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet écran a rejoint le compte par mot clé de récupération : ouvrez « Ajouter un appareil
            » depuis un écran qui détient le téléphone + mot de passe pour partager le QR.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Renseignez le nom de la boutique et son téléphone (Réglages → Boutique) avant
            d&apos;afficher un QR.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
