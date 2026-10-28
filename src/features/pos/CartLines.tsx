import { Minus, Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PosLine } from "@/components/pos";
import { formatFCFA } from "@/lib/format";
import type { PosController } from "./usePos";

/**
 * Saisie de la tournée. Masquée pendant l'encaissement : à ce moment-là on ne commande
 * plus, on compte l'argent.
 */
export function CartLines({ pos }: { pos: PosController }) {
  if (pos.cashing) return null;
  return (
    <>
      {pos.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {pos.activeTable
            ? "Touchez des articles pour composer la prochaine tournée."
            : "Ajoutez des articles depuis la grille."}
        </p>
      ) : (
        <div className="relative space-y-2 max-h-64 sm:max-h-64 max-sm:max-h-[45dvh] overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {/* Fondu bas : la ligne coupée au bord du rouleau annonce qu'il reste des
              choses dessous — sans queue de liste fantôme. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-background to-transparent"
          />
          {/* `layout` fait glisser les lignes restantes quand on en supprime une au
          milieu du panier, au lieu de les faire sauter. `popLayout` évite que la
          ligne en cours de sortie décale les autres pendant son animation. */}
          <AnimatePresence initial={false} mode="popLayout">
            {pos.lines.map((l) => (
              <PosLine
                key={l.key}
                line={l}
                isService={pos.isService}
                onRemoveOne={pos.removeOne}
                onAddOne={pos.addOneByKey}
                onRemove={pos.removeLineByKey}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="border-t pt-3 flex items-center justify-between">
        <span className="text-lg font-semibold">{pos.activeTable ? "Tournée" : "Total"}</span>
        <span className="text-3xl font-bold text-primary tabular-nums">
          {formatFCFA(pos.dueTotal)}
        </span>
      </div>

      {/* Discret à dessein : le cas courant est « 1 client » et ne doit demander
          aucun geste. Absent sur une table : le service n'a pas à compter les
          personnes assises pour prendre une commande, la table compte pour un. */}
      {!pos.activeTable && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Clients servis</span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-11 w-11 sm:h-9 sm:w-9"
              aria-label="Un client de moins"
              disabled={pos.customers <= 1}
              onClick={() => pos.setCustomers((c) => Math.max(1, c - 1))}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center font-semibold">{pos.customers}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-11 w-11 sm:h-9 sm:w-9"
              aria-label="Un client de plus"
              onClick={() => pos.setCustomers((c) => c + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
