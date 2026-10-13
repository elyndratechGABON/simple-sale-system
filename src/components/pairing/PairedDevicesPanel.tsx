import { Button } from "@/components/ui/button";
import { shareLabel } from "@/lib/syncengine/sharing";
import type { PairedDevice, SyncIdentity } from "@/lib/syncengine/types";

interface PairedDevicesPanelProps {
  isOwner: boolean;
  pending: PairedDevice[];
  paired: PairedDevice[];
  pairedCount: number;
  peers: PairedDevice[] | undefined;
  identity: SyncIdentity | undefined;
  produitsCount: number;
  onApprove: (peerId: string) => void;
  onChangeShare: (peer: PairedDevice) => void;
}

export function PairedDevicesPanel({
  isOwner,
  pending,
  paired,
  pairedCount,
  peers,
  identity,
  produitsCount,
  onApprove,
  onChangeShare,
}: PairedDevicesPanelProps) {
  return (
    <>
      {isOwner && pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            En attente d'approbation ({pending.length})
          </p>
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-accent/30 px-3 py-2"
            >
              <span className="truncate text-sm">
                {p.device_name || "Écran inconnu"}
                <span className="ml-1 text-xs text-muted-foreground">· {p.id.slice(0, 6)}…</span>
              </span>
              <Button type="button" size="sm" onClick={() => onApprove(p.id)}>
                Approuver
              </Button>
            </div>
          ))}
        </div>
      )}

      {peers && (
        <p className="text-xs text-muted-foreground">
          {pairedCount > 0
            ? `${pairedCount} employé${pairedCount > 1 ? "s" : ""} connecté${pairedCount > 1 ? "s" : ""} à cette boutique.`
            : "Aucun employé connecté pour l'instant. Partagez le QR ci-dessus."}
        </p>
      )}

      {/* Stock partagé, écran par écran : c'est ICI que le propriétaire change ce qu'un
          employé a le droit de voir. Le réglage s'applique sans ré-appairage. */}
      {isOwner && paired.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Stock partagé</p>
          {paired
            .filter((p) => p.id !== identity?.deviceId)
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.device_name?.trim() || "Écran sans nom"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {shareLabel(p, produitsCount)}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => onChangeShare(p)}>
                  Changer
                </Button>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
