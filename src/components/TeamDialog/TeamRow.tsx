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
        {/* Le nom et ses coordonnées tiennent dans leur colonne : chaque segment
            tronque en propre, et le montant reste à droite sans chevaucher. La méta
            passe en flex-wrap : sur un écran étroit, l'horodatage est renvoyé À LA
            LIGNE sous le téléphone au lieu de s'écraser sur le CA (§5.1). */}
        <p className="truncate text-sm font-medium">
          {device.device_name?.trim() || "Écran sans nom"}
          {isOwnerDevice && <span className="ml-1.5 text-xs text-muted-foreground">(vous)</span>}
        </p>
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          {device.phone?.trim() ? (
            <span className="flex min-w-0 items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="min-w-0 truncate">{device.phone.trim()}</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock className="h-3 w-3 shrink-0" />
            {lastSeenLabel(device.last_seen)}
          </span>
        </p>
      </div>
      {/* CA + ventes : deux lignes distinctes (flex-col), plus rien ne se chevauche
          même quand le téléphone et l'horodatage remplissent leur colonne. */}
      {stats && (
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-sm font-bold tabular-nums">{formatFCFA(stats.revenue)}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {stats.count} vente{stats.count > 1 ? "s" : ""}
          </span>
        </span>
      )}
      <RoleBadge role={device.role} />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
