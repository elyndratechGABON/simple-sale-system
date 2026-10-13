// Dialog Équipe : liste des appareils du compte marchand (propriétaire, employés). Accessible depuis l'icône Users dans le header - owner only.
// Chaque ligne affiche le nom de l'appareil (`device_name` ou le nom de l'employé pour
// une caisse employé), le rôle (badge coloré) et le dernier contact (`last_seen`).
// Cliquer sur un écran approuvé ouvre ses RÉSULTATS : ses ventes sur la période choisie,
// filtrées par `seller_device_id` (ou par nom pour les ventes antérieures au suivi) —
// le propriétaire voit ses ventes directes (aucun vendeur attaché). Les appareils en
// attente d'approbation sont signalés séparément avec un bouton « Approuver ».
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { approveDevice } from "@/lib/syncengine/pairing";
import { usePendingCatalogueRequests } from "@/hooks/use-pending-catalogue-requests";
import { EmployeeResults } from "./EmployeeResults";
import { RoleBadge } from "./RoleBadge";
import { TeamListPanel } from "./TeamListPanel";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Écran à ouvrir directement en détail. C'est par là que l'Activité du personnel
   *  atteint le détail d'un vendeur : une seule implémentation de ce détail, pas deux. */
  initialDeviceId?: string | null;
}

export function TeamDialog({ open, onOpenChange, initialDeviceId }: TeamDialogProps) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Ouverture sur un écran précis (appelée depuis « Activité du personnel »).
  useEffect(() => {
    if (open && initialDeviceId) setSelectedId(initialDeviceId);
  }, [open, initialDeviceId]);

  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    enabled: open,
  });
  const { data: peers } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    enabled: open && Boolean(identity),
    staleTime: 10_000,
  });

  // Demandes de catalogue en attente de confirmation (propriétaire)
  const {
    requests: pendingCatalogueRequests,
    confirm: confirmCatalogue,
    deny: denyCatalogue,
  } = usePendingCatalogueRequests(identity?.shopId ?? null);

  const allDevices = peers ?? [];
  const pending = allDevices.filter((d) => d.status === "pending");
  const paired = allDevices.filter((d) => d.status !== "pending");

  const selected = paired.find((d) => d.id === selectedId) ?? null;

  // Trier : owner en premier, puis employés, puis pending.
  const roleOrder: Record<string, number> = { owner: 0, employee: 1 };
  const sorted = [...paired].sort(
    (a, b) => (roleOrder[a.role ?? "employee"] ?? 9) - (roleOrder[b.role ?? "employee"] ?? 9),
  );

  // Dialog de confirmation pour les demandes de catalogue
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmRequestId, setConfirmRequestId] = useState<string | null>(null);

  function openConfirmDialog(requestId: string) {
    setConfirmRequestId(requestId);
    setConfirmDialogOpen(true);
  }

  function closeConfirmDialog() {
    setConfirmDialogOpen(false);
    setConfirmRequestId(null);
  }

  async function handleConfirm() {
    if (!confirmRequestId) return;
    await confirmCatalogue(confirmRequestId);
    closeConfirmDialog();
  }

  async function handleDeny() {
    if (!confirmRequestId) return;
    await denyCatalogue(confirmRequestId);
    closeConfirmDialog();
  }

  async function approve(peerId: string) {
    await approveDevice(peerId, "employee");
    await qc.invalidateQueries({ queryKey: ["paired_devices"] });
    toast.success("Écran approuvé — rôle employé.");
  }

  function close() {
    setSelectedId(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {selected ? (
            <DialogTitle className="flex items-center gap-2 text-base">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Retour à l'équipe"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <UserRound className="h-5 w-5 text-primary" />
              <span className="truncate">{selected.device_name || "Écran sans nom"}</span>
              <RoleBadge role={selected.role} />
            </DialogTitle>
          ) : (
            <>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Équipe
              </DialogTitle>
              <DialogDescription>
                Appareils connectés à la boutique. Le propriétaire voit tous les écrans du compte.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {selected ? (
          <EmployeeResults device={selected} />
        ) : (
          <TeamListPanel
            sorted={sorted}
            pending={pending}
            paired={paired}
            pendingCatalogueRequests={pendingCatalogueRequests}
            onSelectDevice={setSelectedId}
            approve={approve}
            openConfirmDialog={openConfirmDialog}
            confirmDialogOpen={confirmDialogOpen}
            closeConfirmDialog={closeConfirmDialog}
            confirmRequestId={confirmRequestId}
            onConfirm={handleConfirm}
            onDeny={handleDeny}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
