// Cartes d'affichage de la location : l'ACTIF louable et la LOCATION en cours.
//
// Extraites de `RentalView.tsx` parce que ce fichier dépassait la limite des 200 lignes
// alors que ces deux cartes n'ont rien à voir avec la page qui les liste : elles reçoivent
// tout par props, ne tiennent aucun état de page.

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  KeyRound,
  Package,
  XCircle,
} from "lucide-react";
import type { Product, Rental } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveRentals } from "../hooks/use-rentals";

const STATUS_CONFIG: Record<
  Rental["status"],
  { label: string; variant: "default" | "destructive" | "secondary"; icon: ReactNode }
> = {
  active: {
    label: "Active",
    variant: "default",
    icon: <Clock className="h-3 w-3" />,
  },
  returned: {
    label: "Retournée",
    variant: "secondary",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  overdue: {
    label: "En retard",
    variant: "destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Annulée",
    variant: "secondary",
    icon: <XCircle className="h-3 w-3" />,
  },
};

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Résumé des tarifs d'un actif : les périodes RÉELLEMENT tarifées, pas les 5 possibles. */
export function buildPricingSummary(p: Product): string {
  const rp = p.rental_pricing;
  if (!rp) return "—";
  const parts: string[] = [];
  if (rp.hour) parts.push(`${formatFCFA(rp.hour)}/heure`);
  if (rp.day) parts.push(`${formatFCFA(rp.day)}/jour`);
  if (rp.week) parts.push(`${formatFCFA(rp.week)}/semaine`);
  if (rp.month) parts.push(`${formatFCFA(rp.month)}/mois`);
  if (rp.year) parts.push(`${formatFCFA(rp.year)}/an`);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function useAssetRentalCount() {
  const { data: rentals = [] } = useActiveRentals();
  const counts: Record<string, number> = {};
  for (const r of rentals) {
    counts[r.asset_id] = (counts[r.asset_id] ?? 0) + r.quantity;
  }
  return counts;
}

export function AssetCard({ asset, onBook }: { asset: Product; onBook: (a: Product) => void }) {
  const rentedCount = useAssetRentalCount();
  const totalUnits = asset.total_units ?? 1;
  const rented = rentedCount[asset.id] ?? 0;
  const available = totalUnits - rented;

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={() => onBook(asset)}
    >
      <CardContent className="p-3">
        {asset.photo ? (
          <img
            src={asset.photo}
            alt={asset.name}
            className="h-24 w-full rounded object-cover mb-2"
          />
        ) : (
          <div className="flex h-24 w-full items-center justify-center rounded bg-muted mb-2">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="font-medium text-sm truncate">{asset.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{buildPricingSummary(asset)}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {totalUnits} unité{totalUnits > 1 ? "s" : ""}
          </span>
          {available <= 0 ? (
            <Badge variant="destructive" className="text-xs">
              Complet
            </Badge>
          ) : available < totalUnits ? (
            <Badge variant="default" className="text-xs">
              {available}/{totalUnits} libre{available > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {totalUnits} libre{totalUnits > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RentalRow({ rental, onReturn }: { rental: Rental; onReturn: (r: Rental) => void }) {
  const config = STATUS_CONFIG[rental.status];
  const isOverdue = rental.status === "overdue";
  // Le montant affiché inclut la pénalité de retard : c'est ce que le client doit.
  const total = rental.price_per_unit * rental.quantity + (rental.late_fee ?? 0);

  return (
    <div
      className={`flex items-center justify-between rounded border p-3 ${
        isOverdue ? "border-destructive/50 bg-destructive/5" : ""
      }`}
      onClick={() => onReturn(rental)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onReturn(rental);
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        ) : (
          <KeyRound className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{rental.asset_name}</p>
          <p className="text-xs text-muted-foreground truncate">{rental.client_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {formatDate(rental.start_date)} → {formatDate(rental.expected_end_date)}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <Badge variant={config.variant} className="text-xs gap-1">
          {config.icon}
          {config.label}
        </Badge>
        <p className="text-sm font-medium mt-1">{formatFCFA(total)}</p>
        {rental.quantity > 1 && <p className="text-xs text-muted-foreground">×{rental.quantity}</p>}
      </div>
    </div>
  );
}
