import { useEffect, useState } from "react";
import { Pencil, ShoppingCart, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartShell } from "@/components/pos";
import { PreviousRounds } from "./PreviousRounds";
import { CartLines } from "./CartLines";
import { TableCashing } from "./TableCashing";
import { CartActions } from "./CartActions";
import { cn } from "@/lib/utils";
import type { PosController } from "./usePos";

/**
 * Panier / encaissement. Panneau latéral collant sur grand écran, feuille coulissante
 * sur téléphone (cf. CartShell). N'est monté qu'en mode Comptoir — mais y sert aussi à
 * l'encaissement d'une table, que le plan de salle vient de viser (`kind: "table"`) :
 * d'où l'addition déjà servie, les tournées précédentes et le paiement de la table.
 */
export function CartPanel({ pos }: { pos: PosController }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const tableId = pos.activeTable?.id;

  // Changer de table (ou retomber au comptoir) ferme la saisie en cours : le brouillon
  // ne doit jamais s'appliquer à une autre addition.
  useEffect(() => {
    setRenaming(false);
  }, [tableId]);

  function startRename() {
    if (!pos.activeTable) return;
    setDraft(pos.activeTable.table ?? "");
    setRenaming(true);
  }

  function commitRename() {
    const current = pos.activeTable;
    setRenaming(false);
    if (!current) return;
    const label = draft.trim();
    if (!label || label === current.table) return;
    pos.renameMut.mutate({ saleId: current.id, label });
  }

  return (
    <CartShell compact={pos.compact} open={pos.sheetOpen} onOpenChange={pos.setSheetOpen}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold">
          {pos.activeTable ? (
            <>
              <Utensils className="h-5 w-5 shrink-0" />
              {renaming ? (
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label="Nom de la table"
                  placeholder="Nom de la table"
                  autoFocus
                  maxLength={40}
                  className="h-8 w-40 sm:w-52"
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setRenaming(false);
                  }}
                />
              ) : (
                <>
                  <span className="truncate">Table {pos.activeTable.table}</span>
                  <button
                    type="button"
                    onClick={startRename}
                    aria-label={`Renommer la table ${pos.activeTable.table}`}
                    title="Renommer la table"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 shrink-0" /> Panier
            </>
          )}
        </h2>
        {pos.activeTable ? (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-destructive"
            onClick={() => pos.setCancelPinOpen(true)}
          >
            <X className="h-4 w-4 mr-1" /> Annuler la table
          </Button>
        ) : (
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
