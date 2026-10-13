import { ChevronRight, UserRound } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { SellerRevenueItem } from "./useActivityData";

/** CA par vendeur — une ligne par écran, triée du plus gros au plus petit ; le détail
 *  s'ouvre d'un clic (délégué à la fiche « Équipe »). */
export function SellerRevenueList({
  parVendeur,
  onOpenDevice,
}: {
  parVendeur: SellerRevenueItem[];
  onOpenDevice?: (deviceId: string) => void;
}) {
  if (parVendeur.length === 0) {
    return (
      <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
        Aucune vente sur cette période.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Qui a vendu, du plus gros au plus petit — touchez un vendeur pour son détail.
      </p>
      {parVendeur.map((b) => {
        const details = !b.estMoi && b.key !== "direct" && onOpenDevice;
        const Ligne = details ? "button" : "div";
        return (
          <Ligne
            key={b.key}
            {...(details
              ? {
                  type: "button" as const,
                  onClick: () => onOpenDevice(b.key),
                  className:
                    "flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50",
                }
              : {
                  className:
                    "flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3",
                })}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {b.estMoi ? `${b.nom} (vous)` : b.nom}
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.count} vente{b.count > 1 ? "s" : ""}
                  {b.phone ? ` · ${b.phone}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <p className="font-bold tabular-nums">{formatFCFA(b.revenue)}</p>
              {details && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
            </div>
          </Ligne>
        );
      })}
    </div>
  );
}
