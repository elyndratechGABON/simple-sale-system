// Dialog Équipe — l'interface unique du personnel (propriétaire). Deux vues :
//   1. Liste : le CA de chaque écran sur la période (« Cette caisse » = vos ventes
//      directes), les écrans à approuver, les demandes d'import de stock, l'import de
//      clôture par QR, et l'activité récente (ventes + ajustements).
//   2. Fiche d'un écran : son calendrier mensuel, « EmployeeResults ».
// Elle remplace les anciens dialogues « Équipe », « Employés » et « Activité du
// personnel » — un seul point d'entrée au header, tous les rôles du patron au même
// endroit ; le détail d'un vendeur y vit une seule fois.
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { formatFCFA } from "@/lib/format";
import { approveDevice } from "@/lib/syncengine/pairing";
import type { PairedDevice } from "@/lib/syncengine/types";
import { usePendingCatalogueRequests } from "@/hooks/use-pending-catalogue-requests";
import { EmployeeResults } from "./EmployeeResults";
import { ImportClosing } from "./ImportClosing";
import { RecentActivity } from "./RecentActivity";
import { RoleBadge } from "./RoleBadge";
import { TeamListPanel } from "./TeamListPanel";
import { isOwnSale } from "./helpers";
import { useActivityData } from "./useActivityData";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Écran à ouvrir directement en détail. */
  initialDeviceId?: string | null;
}

export function TeamDialog({ open, onOpenChange, initialDeviceId }: TeamDialogProps) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Ouverture sur un écran précis (demande d'import, notification).
  useEffect(() => {
    if (open && initialDeviceId) setSelectedId(initialDeviceId);
  }, [open, initialDeviceId]);

  const {
    identity,
    range,
    setRange,
    sales,
    movements,
    itemsCount,
    totalRevenue,
    totalCount,
    sortedPeers,
    paired,
    pending,
  } = useActivityData(open);

  // Demandes de catalogue en attente de confirmation (propriétaire)
  const {
    requests: pendingCatalogueRequests,
    confirm: confirmCatalogue,
    deny: denyCatalogue,
  } = usePendingCatalogueRequests(identity?.shopId ?? null);

  // « Un écran n'est JAMAIS son propre pair » : l'écran courant est absent du registre
  // des pairs ; sa ligne (« Cette caisse » — vos ventes directes) est reconstruite ici.
  const selfDevice = useMemo<PairedDevice | null>(() => {
    if (!identity) return null;
    return {
      id: identity.deviceId,
      shop_id: identity.shopId,
      device_name: "Cette caisse",
      role: "owner",
      status: "paired",
      updated_at: Date.now(),
    };
  }, [identity]);

  // CA et ventes par écran sur la période : attribution par `isOwnSale`
  // (`seller_device_id`, ou nom du vendeur pour les ventes antérieures au suivi).
  // Une vente qui ne s'attache à aucun écran du registre est comptée à part —
  // elle reste dans le total, la faire disparaîtrait tromper le patron.
  const { perf, orphans } = useMemo(() => {
    const perf = new Map<string, { count: number; revenue: number }>();
    let orphanRevenue = 0;
    const candidates = selfDevice ? [selfDevice, ...paired] : paired;
    for (const s of sales ?? []) {
      const dev = candidates.find((d) => isOwnSale(s, d));
      if (!dev) {
        orphanRevenue += s.total;
        continue;
      }
      const cur = perf.get(dev.id) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += s.total;
      perf.set(dev.id, cur);
    }
    return { perf, orphans: orphanRevenue };
  }, [sales, paired, selfDevice]);

  // La caisse courante en tête, puis les pairs (propriétaires d'abord, employés ensuite).
  const sorted = selfDevice ? [selfDevice, ...sortedPeers] : sortedPeers;
  const selected =
    (selfDevice && selfDevice.id === selectedId ? selfDevice : null) ??
    paired.find((d) => d.id === selectedId) ??
    null;

  const allDevices = selfDevice ? [selfDevice, ...paired] : paired;

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
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
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
              <UserRound className="h-5 w-5 shrink-0 text-primary" />
              <span className="truncate">{selected.device_name || "Écran sans nom"}</span>
              <RoleBadge role={selected.role} />
            </DialogTitle>
          ) : (
            <>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Équipe
              </DialogTitle>
              <DialogDescription>
                Caisses connectées et activité de leur personnel : ventes par écran et par jour,
                ajustements de stock.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {selected ? (
          <EmployeeResults device={selected} />
        ) : (
          <div className="space-y-3">
            {/* Sélecteur de période */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  { k: "day", label: "Aujourd'hui" },
                  { k: "week", label: "7 jours" },
                  { k: "month", label: "Ce mois" },
                ] as const
              ).map(({ k, label }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRange(k)}
                  className={[
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    range === k
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Total période */}
            <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
              <div>
                <p className="text-sm text-muted-foreground">Total encaissé</p>
                <p className="text-lg font-bold tabular-nums">{formatFCFA(totalRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Ventes</p>
                <p className="text-lg font-bold tabular-nums">{totalCount}</p>
              </div>
            </div>

            <TeamListPanel
              sorted={sorted}
              pending={pending}
              paired={allDevices}
              perf={perf}
              orphans={orphans}
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

            <ImportClosing />

            <RecentActivity
              sales={sales ?? []}
              movements={movements ?? []}
              itemsCount={itemsCount}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
