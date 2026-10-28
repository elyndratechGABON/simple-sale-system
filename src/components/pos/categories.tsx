// Sélecteur de catégorie : deux formes pour le MÊME état — une colonne (desktop) et
// une carte (mobile). Mêmes handlers des deux côtés, donc impossible qu'elles divergent.

import {
  Check,
  CakeSlice,
  CupSoda,
  LayoutGrid,
  Tag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icônes discrètes par catégorie connue (lucide, déjà en usage dans l'app) ;
// toute catégorie inconnue retombe sur Tag. Ne sert qu'à l'habillage.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  Tous: LayoutGrid,
  Plats: Utensils,
  Snacks: Utensils,
  Boissons: CupSoda,
  Boisson: CupSoda,
  Desserts: CakeSlice,
} as const;

/**
 * Catégorie en colonne verticale (desktop 3 colonnes).
 *
 * Même état et mêmes handlers que `CategoryCard` — celle-ci reste utilisée sous 1024 px,
 * où une grille tient mieux qu'une colonne de 200 px. Ici la largeur est FIXE et la
 * hauteur doit rester faible : une catégorie = une rangée, pas une carte. Un vendedor
 * qui vend par catégorie doit voir la liste entière sans défiler.
 */
export function CategoryRail({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICON[label] ?? Tag;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // h-9 : 36 px suffisent ici parce que la cible est large (colonne de 200 px),
        // donc la surface tactile reste bien au-dessus du minimum de 44 px.
        "flex min-h-9 w-full items-center gap-2 rounded-lg border px-2.5 text-left text-[13px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-transparent bg-card/60 text-foreground hover:border-primary/40 hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors",
          active
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 truncate leading-tight">{label}</span>
      <Check
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
        strokeWidth={3}
      />
    </button>
  );
}

export function CategoryCard({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICON[label] ?? Tag;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        // Carte de filtre : minimum tactile 44px, coins 16px, bordure subtile, fond
        // carte. L'état actif passe la carte entière en vert de marque avec une coche —
        // identifiable d'un coup d'œil SANS peser beaucoup plus qu'une carte neutre.
        // La coche est réservée (opacity) : changer de filtre ne décale pas le texte.
        "group flex min-h-11 w-full items-center gap-2 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-colors transition-shadow",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/70 bg-card text-foreground hover:border-primary/50 hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
          active
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
        )}
      >
        <Icon className="h-3 w-3" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 break-words leading-tight">{label}</span>
      <Check
        className={cn("h-4 w-4 shrink-0 transition-opacity", active ? "opacity-100" : "opacity-0")}
        strokeWidth={3}
      />
    </button>
  );
}
