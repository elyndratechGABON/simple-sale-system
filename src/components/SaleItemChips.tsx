import { cn } from "@/lib/utils";

/**
 * Mentions d'articles d'une vente, en petits pastilles plutôt qu'en texte brut
 * « Coupe femme ×1, Manucure ×1 ». `max` borne l'affichage ; l'excédent devient
 * une pastille « +N ». La quantité ne se montre qu'à partir de 2 — « ×1 »
 * n'apprend rien et alourdit la lecture.
 */
export function SaleItemChips({
  items,
  max = 3,
  className,
}: {
  items: { name: string; quantity: number }[];
  max?: number;
  className?: string;
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((it, i) => (
        <span
          key={`${it.name}-${i}`}
          className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
        >
          {it.name}
          {it.quantity > 1 && (
            <span className="ml-1 text-muted-foreground tabular-nums">×{it.quantity}</span>
          )}
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
          +{rest}
        </span>
      )}
    </div>
  );
}
