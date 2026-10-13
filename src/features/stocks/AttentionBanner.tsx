import { ArrowRight, TriangleAlert } from "lucide-react";

/**
 * Bloc attention replié sur une ligne. Il occupait ~370 px pour répéter les
 * compteurs que les chips « Stock faible » et « Rupture » affichent déjà juste
 * au-dessus ; la liste détaillée est accessible d'un tap, elle n'a pas besoin
 * d'être dépliée en permanence au-dessus des produits.
 */
export function AttentionBanner({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-left transition-colors hover:bg-amber-500/10"
    >
      <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="min-w-0 flex-1 truncate text-xs">
        <span className="font-semibold">Attention au stock</span> · {count} produit
        {count > 1 ? "s" : ""} à surveiller
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
    </button>
  );
}
