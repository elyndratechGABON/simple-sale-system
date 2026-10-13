import { ShoppingCart } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { PosController } from "./usePos";

/**
 * Barre de résumé, téléphone uniquement. Le total et l'action principale restent sous le
 * pouce en permanence : sans elle, « Valider la vente » tombait hors champ sur le geste le
 * plus répété du service.
 */
export function MobileCartBar({ pos }: { pos: PosController }) {
  if (!(pos.compact && (pos.activeTable !== null || pos.lines.length > 0))) return null;
  return (
    <button
      type="button"
      onClick={() => pos.setSheetOpen(true)}
      // Posée AU-DESSUS de la barre d'onglets, pas par-dessus : `--bottomnav-h` est la
      // hauteur des onglets et `env(safe-area-inset-bottom)` la marge que cette barre
      // s'ajoute. `--kb-h` remonte la barre au-dessus du clavier quand il ouvre.
      className="fixed inset-x-0 bottom-[calc(var(--bottomnav-h)+var(--kb-h,0px)+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 border-t bg-primary px-4 py-2.5 text-primary-foreground shadow-lg"
    >
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="truncate text-xs opacity-90">
          {pos.activeTable ? `Table ${pos.activeTable.table}` : "Comptoir"}
          {pos.lines.length > 0
            ? ` · ${pos.lines.length} article${pos.lines.length > 1 ? "s" : ""}`
            : ""}
        </span>
        <span className="text-xl font-bold tabular-nums">
          {formatFCFA(pos.activeTable ? pos.activeTable.total : pos.total)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 font-semibold">
        <ShoppingCart className="h-4 w-4" />
        {pos.activeTable && pos.lines.length === 0 ? "Encaisser" : "Ouvrir"}
      </span>
    </button>
  );
}
