// Factures en cours : bouton Encaisser + bouton Annuler PAR LIGNE — le patron
// annule la table directement dans la liste, sans devoir d'abord OUVRIR la table
// et repasser par son panier.
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { Sale } from "@/lib/db";
import { PinDialog } from "@/components/PinDialog";
import type { PosController } from "./usePos";

interface InProgressBillsProps {
  pos: PosController;
  onCheckout: (sale: Sale) => void;
}

export function InProgressBills({ pos, onCheckout }: InProgressBillsProps) {
  // La table en passe d'être annulée : le PIN s'adresse à ELLE, pas à la table active.
  const [cible, setCible] = useState<Sale | null>(null);

  if (!pos.hasTables || pos.openTables.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Factures en cours ({pos.openTables.length})
      </h3>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {pos.openTables.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium">Table {sale.table}</span>
                <span className="font-bold text-primary tabular-nums">
                  {sale.total > 0 ? formatFCFA(sale.total) : "—"}
                </span>
              </div>
              {sale.opened_at && (
                <div className="text-xs text-muted-foreground">
                  Ouverte à{" "}
                  {new Date(sale.opened_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={sale.total <= 0}
              onClick={() => onCheckout(sale)}
            >
              Encaisser
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Supprimer la facture de la table ${sale.table}`}
              title="Annuler la facture et libérer la table"
              onClick={() => setCible(sale)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Confirmation destructive (mission tables) : la garde PIN de la caisse —
          même chaîne que l'annulation depuis le panier. `cancelSale` supprime
          l'addition ET restitue le stock ; la table repassera à « Libre ». */}
      <PinDialog
        open={cible !== null}
        onOpenChange={(o) => !o && setCible(null)}
        description={`Voulez-vous annuler la table ${cible?.table ?? ""} et libérer le stock ?${
          (cible?.total ?? 0) > 0
            ? ` L'addition de ${formatFCFA(cible?.total ?? 0)} sera supprimée.`
            : " L'addition est vide, la table sera simplement libérée."
        }`}
        onConfirm={() => {
          if (!cible) return;
          pos.cancelTableMut.mutate(cible.id, {
            onSuccess: () => setCible(null),
            onError: () => toast.error("Table non annulée."),
          });
        }}
      />
    </div>
  );
}
