// Dialog « Activité » — suivi du personnel pour le propriétaire.
//
// Accessible depuis une icône du header (propriétaire uniquement). Trois volets :
//   1. CA par vendeur : chaque employé avec son nombre de ventes et son montant
//      encaissé sur la période. Les ventes d'une caisse propriétaire (aucun `seller_name`)
//      sont agrégées sous « Direct ».
//   2. Actions récentes : les ventes et ajustements de stock les plus récents, horodatés.
//   3. Caisses : l'état de chaque appareil du compte (rôle, dernier contact, connecté/à
//      approuver) — le registre des pairs.
import { Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFCFA } from "@/lib/format";
import { PeerList } from "./PeerList";
import { RecentActivity } from "./RecentActivity";
import { SellerRevenueList } from "./SellerRevenueList";
import { useActivityData } from "./useActivityData";

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ouvre le détail d'un vendeur (délégué à la fiche « Équipe », qui sait déjà le montrer). */
  onOpenDevice?: (deviceId: string) => void;
}

export function ActivityDialog({ open, onOpenChange, onOpenDevice }: ActivityDialogProps) {
  const {
    range,
    setRange,
    sales,
    movements,
    itemsCount,
    parVendeur,
    totalRevenue,
    totalCount,
    sortedPeers,
    pending,
  } = useActivityData(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Activité du personnel
          </DialogTitle>
          <DialogDescription>
            Ventes et ajustements de chaque caisse, sur la période choisie.
          </DialogDescription>
        </DialogHeader>

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
            <p className="text-xl font-bold tabular-nums">{formatFCFA(totalRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Ventes</p>
            <p className="text-xl font-bold tabular-nums">{totalCount}</p>
          </div>
        </div>

        <SellerRevenueList parVendeur={parVendeur} onOpenDevice={onOpenDevice} />

        <RecentActivity sales={sales ?? []} movements={movements ?? []} itemsCount={itemsCount} />

        <PeerList sortedPeers={sortedPeers} pending={pending} />
      </DialogContent>
    </Dialog>
  );
}
