// Dialog « Équipe » : liste des appareils du compte marchand (propriétaire, gérants,
// employés). Accessible depuis l'icône Users dans le header — owner only.
//
// Chaque ligne affiche le nom de l'appareil (`employee_name`), le rôle (badge coloré)
// et le dernier contact (`last_seen`). Les appareils en attente d'approbation sont
// signalés séparément avec un bouton « Approuver ».
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock, MonitorSmartphone, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { approveDevice, ROLE_LABELS } from "@/lib/syncengine/pairing";
import type { PairedDevice, DeviceRole } from "@/lib/syncengine/types";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Badge coloré selon le rôle. */
function RoleBadge({ role }: { role?: DeviceRole }) {
  if (!role || role === "owner") {
    return (
      <Badge variant="default" className="bg-primary text-primary-foreground gap-1">
        <BadgeCheck className="h-3 w-3" />
        {ROLE_LABELS.owner}
      </Badge>
    );
  }
  if (role === "manager") {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 gap-1"
      >
        <UserCheck className="h-3 w-3" />
        {ROLE_LABELS.manager}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      {ROLE_LABELS.employee}
    </Badge>
  );
}

/** Formate le dernier contact en texte relatif. */
function lastSeenLabel(ts?: number): string {
  if (!ts) return "Jamais";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return `Il y a ${Math.floor(diff / 86_400_000)} j`;
}

export function TeamDialog({ open, onOpenChange }: TeamDialogProps) {
  const qc = useQueryClient();

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

  const allDevices = peers ?? [];
  const pending = allDevices.filter((d) => d.status === "pending");
  const paired = allDevices.filter((d) => d.status !== "pending");

  // Trier : owner en premier, puis managers, puis employés, puis pending.
  const roleOrder: Record<string, number> = { owner: 0, manager: 1, employee: 2 };
  const sorted = [...paired].sort(
    (a, b) => (roleOrder[a.role ?? "employee"] ?? 9) - (roleOrder[b.role ?? "employee"] ?? 9),
  );

  async function approve(peerId: string) {
    await approveDevice(peerId, "employee");
    await qc.invalidateQueries({ queryKey: ["paired_devices"] });
    toast.success("Écran approuvé — rôle employé.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Équipe
          </DialogTitle>
          <DialogDescription>
            Appareils connectés à la boutique. Le propriétaire voit tous les écrans du compte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Écrans approuvés */}
          {sorted.length > 0 ? (
            <div className="space-y-2">
              {sorted.map((d) => (
                <TeamRow key={d.id} device={d} isOwnerDevice={d.role === "owner"} />
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
                    <p className="truncate text-sm font-medium">
                      {d.device_name || "Écran inconnu"}
                    </p>
                    <p className="text-xs text-muted-foreground">{d.id.slice(0, 8)}…</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => void approve(d.id)}>
                    Approuver
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {paired.length > 0
              ? `${paired.length} écran${paired.length > 1 ? "s" : ""} actif${paired.length > 1 ? "s" : ""}`
              : "Partagez votre boutique via Réglages → Appareils → Ajouter un appareil."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamRow({ device, isOwnerDevice }: { device: PairedDevice; isOwnerDevice: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {device.device_name || "Écran sans nom"}
          {isOwnerDevice && <span className="ml-1.5 text-xs text-muted-foreground">(vous)</span>}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {lastSeenLabel(device.last_seen)}
        </p>
      </div>
      <RoleBadge role={device.role} />
    </div>
  );
}
