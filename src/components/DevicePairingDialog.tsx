// Appairage d'un écran supplémentaire : le QR affiché contient les identifiants du
// compte marchand. La nouvelle caisse le scanne (bouton « Scanner le QR » du mode
// « Rejoindre » à l'onboarding) et rejoint le compte au premier handshake.
//
// Le QR est généré à la demande (import dynamique de `qrcode`) : rien dans le bundle
// principal, rien en réseau — tout reste local. Le payload embarquant le mot de passe,
// le dialogue le rappelle explicitement : à ne montrer qu'à ses propres appareils.
//
// Ce fichier n'est plus qu'un aiguillage : le QR vit dans `QRBlock`, l'affichage du code
// temporaire dans `PairingCodeDisplay`, la liste des écrans dans `PairedDevicesPanel`.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccountQuota, refreshAccountQuota, blessEmployeeDevice } from "@/lib/gatekeeper";
import { getDB, getShopProfile, listProducts } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { invalidateDeviceQueries, listPairedDevices } from "@/lib/syncengine/peers";
import { ShareStockDialog } from "@/components/ShareStockDialog";
import { approveDevice, getPairingToken, pairCodeExpiry } from "@/lib/syncengine/pairing";
import type { PairedDevice } from "@/lib/syncengine/types";
import { QRBlock } from "@/components/pairing/QRBlock";
import { PairingCodeDisplay } from "@/components/pairing/PairingCodeDisplay";
import { PairedDevicesPanel } from "@/components/pairing/PairedDevicesPanel";

interface DevicePairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevicePairingDialog({ open, onOpenChange }: DevicePairingDialogProps) {
  const qc = useQueryClient();
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [codeExpiry, setCodeExpiry] = useState<number | null>(null);
  // Partage de stock : écran employé dont on est en train de régler le partage.
  const [sharePeer, setSharePeer] = useState<PairedDevice | null>(null);

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
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    enabled: open,
  });
  const { data: peers } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    enabled: open && Boolean(identity),
  });
  // Nombre de produits du catalogue : le libellé « Tout le stock (N produits) » doit
  // compter le catalogue RÉEL, pas une valeur devinée.
  const { data: produitsCount } = useQuery({
    queryKey: ["share_stock_count"],
    queryFn: async () => (await listProducts()).length,
    enabled: open,
    staleTime: 15_000,
  });

  const hasNamePhone = Boolean(
    (profile?.accountPhone || profile?.phone) && (profile?.accountName || profile?.storeName),
  );
  // Identifiants complets (téléphone + mot de passe) : seuls ceux qui les détiennent
  // voient la fiche « Compte marchand » avec le mot de passe.
  const hasCredentials = Boolean(profile?.accountPhone && profile.accountPassword);
  const hasKeywordOnly = Boolean(profile?.accountKeyword) && !hasCredentials;
  const hasAnyAccount = hasNamePhone || hasKeywordOnly;
  // Crédit d'écrans LOCAL (offline-first : l'approuvé vit sur le téléphone du propriétaire
  // avant que l'orchestrateur ne le rattache). 1 = cet écran + les écrans `paired` du groupe.
  const localDeviceCount = 1 + (peers ?? []).filter((p) => p.status === "paired").length;
  const atCapacity = quota ? localDeviceCount >= quota.maxDevices : false;
  const isOwner = identity?.role === "owner";
  const pending = (peers ?? []).filter((p) => p.status === "pending");
  const paired = (peers ?? []).filter((p) => p.status !== "pending");
  const pairedCount = paired.length;
  const minutesLeft = codeExpiry ? Math.max(0, Math.ceil((codeExpiry - Date.now()) / 60_000)) : 0;

  // Code de paire : recharger le code actif (et son expiration) à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [code, expiry] = await Promise.all([getPairingToken(), pairCodeExpiry()]);
      if (!cancelled) {
        setPairCode(code);
        setCodeExpiry(expiry);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Nom affiché : reprendre celui de l'identité dès qu'elle est chargée.
  useEffect(() => {
    if (!open) return;
    let annule = false;
    void (async () => {
      // Le compteur du compte vient du SERVEUR : le cached peut dater du dernier
      // handshake, donc d'avant l'employé qui vient de scanner. On le rafraîchit à
      // l'ouverture — c'est le moment où le patron regarde cette carte.
      const frais = await refreshAccountQuota();
      if (annule) return;
      if (frais) await qc.invalidateQueries({ queryKey: ["account_quota"] });
    })();
    return () => {
      annule = true;
    };
  }, [open, qc]);

  async function approve(peerId: string) {
    await approveDevice(peerId, "employee");
    await qc.invalidateQueries({ queryKey: ["paired_devices"] });
    toast.success("Écran approuvé — rôle employé.");
    // Rattachement au compte marchand (best-effort, non bloquant) : le crédit d'écran est
    // déjà local ; ceci n'actualise que le compteur serveur, dès que l'orchestrateur répond.
    const peer = await getDB().paired_devices.get(peerId);
    if (peer?.server_device_id) {
      const res = await blessEmployeeDevice(peer.server_device_id);
      if (res.ok) {
        await getDB().paired_devices.update(peerId, { blessed_at: Date.now() });
      } else {
        toast.info("Enregistrement serveur en attente.", { description: res.message });
      }
    }
    // Le nombre d'écrans affiché ailleurs (carte « Appareils », quota) dépend de trois
    // requêtes distinctes ; l'invalidateur central les rafraîchit toutes. Sans cela le
    // compteur restait figé jusqu'au handshake suivant — indéfiniment hors ligne.
    await invalidateDeviceQueries(qc);
    // Le compteur affiché doit bouger ICI, sans attendre que le patron ferme et rouvre le
    // dialogue : l'approbation vient de consommer une place, c'est le moment de le dire.
    const frais = await refreshAccountQuota();
    if (frais) await qc.invalidateQueries({ queryKey: ["account_quota"] });
    // L'approbation est le moment où le propriétaire décide du STOCK : on ouvre le choix
    // tout de suite, tant qu'il a l'écran en tête.
    const approuve = await getDB().paired_devices.get(peerId);
    if (approuve) setSharePeer(approuve);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Ajouter un appareil
          </DialogTitle>
          <DialogDescription>
            L'employé scanne ce code, entre son nom, et reçoit le stock, les ventes et la caisse du
            propriétaire via le relais.
          </DialogDescription>
        </DialogHeader>

        {hasNamePhone ? (
          <QRBlock
            open={open}
            hasNamePhone={hasNamePhone}
            identity={identity}
            profile={profile}
            quota={quota}
            localDeviceCount={localDeviceCount}
            atCapacity={atCapacity}
            isOwner={isOwner}
            pairCode={pairCode}
            setPairCode={setPairCode}
            setCodeExpiry={setCodeExpiry}
          />
        ) : profile?.accountKeyword ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet écran a rejoint le compte{" "}
            <span className="font-medium text-foreground">par mot clé de récupération</span> : il
            n'a pas le téléphone ni le nom du compte, que le QR transporte. Depuis un écran qui
            détient le compte (téléphone + mot de passe), ouvrez ici « Ajouter un appareil » pour
            partager le code QR.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet appareil n'a pas encore d'identité marchande : renseignez le nom de la{" "}
            <span className="font-medium text-foreground">boutique</span> et son{" "}
            <span className="font-medium text-foreground">téléphone</span> (Réglages → Boutique)
            avant d'afficher un code QR.
          </p>
        )}

        {hasAnyAccount && (
          <div className="space-y-3 rounded-xl border p-4">
            {isOwner && <PairingCodeDisplay pairCode={pairCode} minutesLeft={minutesLeft} />}

            <PairedDevicesPanel
              isOwner={isOwner}
              pending={pending}
              paired={paired}
              pairedCount={pairedCount}
              peers={peers}
              identity={identity}
              produitsCount={produitsCount ?? 0}
              onApprove={approve}
              onChangeShare={setSharePeer}
            />
          </div>
        )}
      </DialogContent>

      {/* Le choix du stock : une modale au-dessus de l'appairage, pour qu'un partage ne
          puisse pas rester coincé derrière ce dialogue. */}
      <ShareStockDialog
        open={sharePeer !== null}
        onOpenChange={(v) => {
          if (!v) {
            setSharePeer(null);
            void qc.invalidateQueries({ queryKey: ["paired_devices"] });
          }
        }}
        peer={sharePeer}
        onShared={(count) =>
          toast.success("Stock partagé — l'employé le reçoit à sa prochaine connexion.")
        }
      />
    </Dialog>
  );
}
