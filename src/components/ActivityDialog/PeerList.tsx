import { BadgeCheck, MonitorSmartphone, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DeviceRole, PairedDevice } from "@/lib/syncengine/types";
import { lastSeenLabel } from "./helpers";

/** Badge coloré selon le rôle. */
function RoleBadge({ role }: { role?: DeviceRole }) {
  if (!role || role === "owner") {
    return (
      <Badge variant="default" className="bg-primary text-primary-foreground gap-1">
        <BadgeCheck className="h-3 w-3" />
        Propriétaire
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      Employé
    </Badge>
  );
}

function DeviceRow({ device, pending }: { device: PairedDevice; pending?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${pending ? "bg-amber-500" : "bg-emerald-500"}`}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {device.device_name?.trim() || "Écran sans nom"}
          </p>
          {/* Numéro déclaré par l'écran : c'est ce que le patron compose. Vide = non
              déclaré, et on le dit — un numéro inventé serait pire qu'un numéro absent. */}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {device.phone?.trim() ? (
              <>
                <Phone className="h-3 w-3" />
                <a
                  href={`tel:${device.phone.replace(/\s+/g, "")}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {device.phone.trim()}
                </a>
              </>
            ) : (
              <>
                <MonitorSmartphone className="h-3 w-3" />
                {lastSeenLabel(device.last_seen)}
              </>
            )}
          </p>
        </div>
      </div>
      {pending ? <Badge variant="outline">À approuver</Badge> : <RoleBadge role={device.role} />}
    </div>
  );
}

/** Registre des caisses du compte : approuvées d'abord, puis à approuver. */
export function PeerList({
  sortedPeers,
  pending,
}: {
  sortedPeers: PairedDevice[];
  pending: PairedDevice[];
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Users className="h-4 w-4 text-primary" /> Caisses connectées
      </p>
      {sortedPeers.length === 0 && pending.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucune autre caisse rencontrée pour l'instant. Ajoutez un appareil dans Réglages →
          Appareils.
        </p>
      ) : (
        <div className="space-y-1.5">
          {sortedPeers.map((p) => (
            <DeviceRow key={p.id} device={p} />
          ))}
          {pending.map((p) => (
            <DeviceRow key={p.id} device={p} pending />
          ))}
        </div>
      )}
    </div>
  );
}
