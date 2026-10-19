import { ChevronRight, Clock, MonitorSmartphone, Phone } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { PairedDevice } from "@/lib/syncengine/types";
import { RoleBadge } from "./RoleBadge";
import { lastSeenLabel } from "./helpers";

export interface RowStats {
  count: number;
  revenue: number;
}

export function TeamRow({
  device,
  isOwnerDevice,
  stats,
  onClick,
}: {
  device: PairedDevice;
  isOwnerDevice: boolean;
  /** CA et ventes de l'écran sur la période choisie. Manquant = période sans vente ? Non :
   *  absent seulement pour les écrans en attente, qui n'ont rien vendu sur le compte. */
  stats?: RowStats;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {device.device_name?.trim() || "Écran sans nom"}
          {isOwnerDevice && <span className="ml-1.5 text-xs text-muted-foreground">(vous)</span>}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {device.phone?.trim() ? (
            <>
              <Phone className="h-3 w-3" />
              {device.phone.trim()}
              <span aria-hidden>·</span>
            </>
          ) : null}
          <Clock className="h-3 w-3" />
          {lastSeenLabel(device.last_seen)}
        </p>
      </div>
      {stats && (
        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold tabular-nums">{formatFCFA(stats.revenue)}</span>
          <span className="block text-xs text-muted-foreground">
            {stats.count} vente{stats.count > 1 ? "s" : ""}
          </span>
        </span>
      )}
      <RoleBadge role={device.role} />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
