import { Wifi } from "lucide-react";
import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import type { PairedDevice } from "@/lib/syncengine/types";
import { MasterSyncBadge } from "@/components/MasterSyncBadge";
import { Badge } from "@/components/ui/badge";

export function SyncedDevices({ peers }: { peers: PairedDevice[] }) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Wifi className="h-4 w-4" /> Caisses synchronisées
        </p>
        <div className="flex items-center gap-2">
          <MasterSyncBadge peers={peers} />
          {peers.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {peers.length} appareil{peers.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Les caisses du même compte relient produits, ventes et stock hors serveur — le relais ne
        stocke qu'un temps, jamais les lignes de vente.
      </p>
      {peers.length > 0 ? (
        <ul className="space-y-1.5">
          {peers.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                {p.status === "pending" ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.device_name || "Écran sans nom"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.role && ROLE_LABELS[p.role]} · {p.id.slice(0, 8)}…
                  </p>
                </div>
              </div>
              <Badge variant={p.status === "pending" ? "outline" : "secondary"}>
                {p.status === "pending" ? "À approuver" : "Synchronisé"}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aucune autre caisse rencontrée pour l'instant : ouvrez le bouton ci-dessous pour afficher
          un code de paire ou en saisir un.
        </p>
      )}
    </div>
  );
}
