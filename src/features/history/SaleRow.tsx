import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, User, X } from "lucide-react";
import { cancelSale, isClosed, type Sale, type SaleItem } from "@/lib/db";
import { formatFCFA, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PinDialog } from "@/components/PinDialog";
import { SaleItemChips } from "@/components/SaleItemChips";
import { toast } from "sonner";

export function SaleRow({
  sale,
  profit,
  items,
}: {
  sale: Sale;
  profit: number;
  items: SaleItem[];
}) {
  const [open, setOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const qc = useQueryClient();

  const cancelMut = useMutation({
    mutationFn: () => cancelSale(sale.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Vente annulée, stock restauré");
      setPinOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-3">
        {/* Ligne simplifiée : heure · table · client · nb articles · total */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold tabular-nums">{formatTime(sale.timestamp)}</span>
              {sale.table && (
                <Badge variant="outline" className="text-xs">
                  Table {sale.table}
                </Badge>
              )}
              {sale.client_name && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <User className="h-3 w-3" />
                  {sale.client_name}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <SaleItemChips items={items} />
              {isClosed(sale) && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  clôturée
                </Badge>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right text-base font-bold text-primary tabular-nums sm:text-lg">
            {formatFCFA(sale.total)}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
            aria-label={open ? "Replier la vente" : "Déplier la vente"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
            aria-label="Annuler la vente"
            onClick={() => setPinOpen(true)}
            disabled={isClosed(sale)}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {/* Détail déplié : articles, cash, rendu, bénéfice */}
        {open && (
          <div className="mt-3 border-t pt-3 space-y-2 text-sm">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{it.name}</span>
                  {it.quantity > 1 && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums">
                      ×{it.quantity}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatFCFA(it.price_at_sale * it.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Donné{" "}
                <span className="font-medium text-foreground">{formatFCFA(sale.cash_given)}</span>
              </span>
              <span>
                Rendu{" "}
                <span className="font-medium text-foreground">{formatFCFA(sale.change_due)}</span>
              </span>
              {profit > 0 && (
                <span>
                  Bénéfice{" "}
                  <span className="font-medium text-emerald-600">{formatFCFA(profit)}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <PinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        description="Entrez le code PIN pour confirmer l'annulation. Le stock sera restauré."
        onConfirm={() => cancelMut.mutate()}
      />
    </Card>
  );
}
