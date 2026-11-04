// Icône du mouvement (mission design historique) : une ENTRÉE (stock qui monte)
// ou une SORTIE (stock qui descend) — le sens se lit à l'icône, la nature au texte.
import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";
import { listStockMovements, type StockMovement } from "@/lib/db";
import { formatRelative, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { REASON_LABEL } from "./stock-state";

function MovementRow({ movement }: { movement: StockMovement }) {
  const positive = movement.delta > 0;
  const Icon = positive ? ArrowDownCircle : ArrowUpCircle;
  const quantite = Math.abs(movement.delta);
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5">
      {/* Sens du mouvement, à gauche : icône seule, lisible d'un coup d'œil. */}
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          positive
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {/* Produit + nature, au centre (les deux tronquent, jamais de débordement). */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{movement.product_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {REASON_LABEL[movement.reason]}
          {movement.supplier ? ` · ${movement.supplier}` : ""}
          {movement.note ? ` · ${movement.note}` : ""}
        </p>
      </div>
      {/* Quantité PUIS heure, à droite : la colonne qui se compare en balayant. */}
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-bold leading-tight tabular-nums",
            positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          {positive ? "+" : "−"}
          {quantite}
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {formatRelative(movement.created_at)} · {formatTime(movement.created_at)}
        </p>
      </div>
    </div>
  );
}

/** Liste des mouvements d'un produit, pour la fiche détaillée. */
export function MovementList({
  productId,
  limit,
  emptyLabel,
}: {
  productId: string;
  limit: number;
  emptyLabel: string;
}) {
  const { data: movements = [] } = useQuery({
    queryKey: ["movements", productId],
    queryFn: () => listStockMovements({ productId, limit }),
  });
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Historique des mouvements</p>
      {movements.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {movements.map((m) => (
            <MovementRow key={m.id} movement={m} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Journal global : derniers mouvements tous produits confondus.
 *
 * Bottom sheet SUR TÉLÉPHONE (<md) — c'est une liste de consultation, le geste
 * naturel du pouce est de la tirer depuis le bas et de la refermer d'un
 * glissement ; modale centrée au-delà, où le pointeur n'a pas de préférence.
 * Même contenu dans les deux conteneurs : un seul jeu d'enfants, zéro doublon.
 */
export function MovementsDialog({
  open,
  onOpenChange,
  productId = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Restreint l'historique à une fiche. `null` = tous les mouvements. */
  productId?: string | null;
}) {
  const isMobile = useIsMobile(768);
  // Le `productId` entre dans la clé de cache : changer de fiche recharge, alors
  // qu'ouvrir le dialogue deux fois sur la même ne requête pas.
  const { data: movements = [] } = useQuery({
    queryKey: ["movements", productId ?? "all"],
    queryFn: () => listStockMovements({ limit: 50, ...(productId ? { productId } : {}) }),
    enabled: open,
  });

  const content = (
    <>
      {/* TITRE EN DOUBLE CORRIGÉ (mission historique) : l'en-tête n'est rendu que
          dans la modale desktop — sur mobile, le `DrawerTitle` joue ce rôle et le
          second titre du contenu a été supprimé. */}
      {movements.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          Aucun mouvement enregistré. Réapprovisionnez un produit ou effectuez une vente.
        </p>
      ) : (
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {movements.map((m) => (
            <MovementRow key={m.id} movement={m} />
          ))}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle className="px-4 pt-1 text-base font-semibold">
            <span className="flex items-center justify-center gap-2">
              <History className="h-4 w-4" /> Historique des mouvements
            </span>
          </DrawerTitle>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Historique des mouvements
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
