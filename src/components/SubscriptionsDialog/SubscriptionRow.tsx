import { Pencil, Trash2 } from "lucide-react";
import type { Subscription } from "@/lib/db";
import { formatDateShort, formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { subscriptionStatus } from "./helpers";

/** Une fiche d'abonné : identité, période, montant, statut et actions. */
export function SubscriptionRow({
  sub,
  confirmDelete,
  onDelete,
  onCancelDelete,
  onEdit,
  onTogglePaid,
}: {
  sub: Subscription;
  confirmDelete: boolean;
  onDelete: () => void;
  onCancelDelete: () => void;
  onEdit: () => void;
  onTogglePaid: () => void;
}) {
  const status = subscriptionStatus(sub);
  const variant = status === "expiré" ? "destructive" : status === "payé" ? "default" : "outline";

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{sub.clientName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {sub.phone ? `${sub.phone} · ` : ""}
            {sub.plan}
          </div>
        </div>
        <Badge variant={variant}>{status}</Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground tabular-nums">
          {formatDateShort(sub.startDate)} → {formatDateShort(sub.endDate)}
        </span>
        <span className="font-bold tabular-nums">{formatFCFA(sub.price)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Switch checked={sub.paid} onCheckedChange={onTogglePaid} aria-label="Paiement reçu" />
          Payé
        </label>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9"
            aria-label="Modifier"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {confirmDelete ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-11 sm:h-8"
              onClick={onDelete}
              onMouseLeave={onCancelDelete}
            >
              Confirmer ?
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-destructive sm:h-9 sm:w-9"
              aria-label="Supprimer"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
