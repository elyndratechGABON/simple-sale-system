import { Button } from "@/components/ui/button";
import { CatalogueRequestConfirmDialog } from "@/components/CatalogueRequestConfirmDialog";
import type { PairedDevice } from "@/lib/syncengine/types";
import type { PendingCatalogueRequest } from "@/hooks/use-pending-catalogue-requests";
import { TeamRow } from "./TeamRow";

/** Volet liste : écrans approuvés, en attente d'approbation, et demandes d'import. */
export function TeamListPanel({
  sorted,
  pending,
  paired,
  pendingCatalogueRequests,
  onSelectDevice,
  approve,
  openConfirmDialog,
  confirmDialogOpen,
  closeConfirmDialog,
  confirmRequestId,
  onConfirm,
  onDeny,
}: {
  sorted: PairedDevice[];
  pending: PairedDevice[];
  paired: PairedDevice[];
  pendingCatalogueRequests: PendingCatalogueRequest[];
  onSelectDevice: (deviceId: string) => void;
  approve: (peerId: string) => void;
  openConfirmDialog: (requestId: string) => void;
  confirmDialogOpen: boolean;
  closeConfirmDialog: () => void;
  confirmRequestId: string | null;
  onConfirm: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Écrans approuvés */}
      {sorted.length > 0 ? (
        <div className="space-y-2">
          {sorted.map((d) => (
            <TeamRow
              key={d.id}
              device={d}
              isOwnerDevice={d.role === "owner"}
              onClick={() => onSelectDevice(d.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun appareil synchronisé pour l'instant.
        </p>
      )}

      {/* En attente d'approbation */}
      {pending.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            En attente d'approbation ({pending.length})
          </p>
          {pending.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-accent/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.device_name || "Écran inconnu"}</p>
                <p className="text-xs text-muted-foreground">{d.id.slice(0, 8)}…</p>
              </div>
              <Button type="button" size="sm" onClick={() => void approve(d.id)}>
                Approuver
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Demandes d'import de catalogue en attente */}
      {pendingCatalogueRequests.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Demandes d'import de stock ({pendingCatalogueRequests.length})
          </p>
          {pendingCatalogueRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-blue-50 border-blue-200 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-blue-800">
                  Import demandé par {req.requester_id.slice(0, 8)}…
                </p>
                <p className="text-xs text-blue-600">
                  {new Date(req.created_at).toLocaleString()} · {req.status}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openConfirmDialog(req.id)}
              >
                {req.status === "pending" ? "Voir" : req.status}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground text-center">
          {paired.length > 0
            ? `${paired.length} écran${paired.length > 1 ? "s" : ""} actif${paired.length > 1 ? "s" : ""}`
            : "Partagez votre boutique via Réglages → Appareils → Ajouter un appareil."}
        </p>
        {/* Dialog de confirmation pour les demandes d'import de catalogue */}
        <CatalogueRequestConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={closeConfirmDialog}
          requesterId={confirmRequestId ?? ""}
          onConfirm={onConfirm}
          onDeny={onDeny}
        />
      </div>
    </div>
  );
}
