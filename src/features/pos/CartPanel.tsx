import { ShoppingCart, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartShell } from "@/components/pos";
import { PreviousRounds } from "./PreviousRounds";
import { CartLines } from "./CartLines";
import { TableCashing } from "./TableCashing";
import { CartActions } from "./CartActions";
import type { PosController } from "./usePos";

/**
 * Panier / encaissement. Panneau latéral collant sur grand écran, feuille coulissante
 * sur téléphone (cf. CartShell). Assemble l'addition déjà servie, la saisie de la
 * tournée, l'encaissement sur table et l'action principale.
 */
export function CartPanel({ pos }: { pos: PosController }) {
  return (
    <CartShell compact={pos.compact} open={pos.sheetOpen} onOpenChange={pos.setSheetOpen}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {pos.activeTable ? (
            <>
              <Utensils className="h-5 w-5" /> Table {pos.activeTable.table}
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" /> Panier
            </>
          )}
        </h2>
        {pos.activeTable ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => pos.setCancelPinOpen(true)}
          >
            <X className="h-4 w-4 mr-1" /> Annuler la table
          </Button>
        ) : (
          // « Vider » et non « Annuler » : ce bouton ne fait que remettre le panier à zéro.
          <Button
            size="sm"
            variant="ghost"
            onClick={pos.resetCart}
            disabled={pos.lines.length === 0}
          >
            <X className="h-4 w-4 mr-1" /> Vider
          </Button>
        )}
      </div>

      <PreviousRounds pos={pos} />
      <CartLines pos={pos} />
      <TableCashing pos={pos} />
      <CartActions pos={pos} />
    </CartShell>
  );
}
