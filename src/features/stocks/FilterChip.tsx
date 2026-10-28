import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChipTone } from "./stock-state";

/**
 * Chip de filtre dans un rangée scrollable horizontalement.
 *
 * Remplace les anciennes cards de 64 px de haut qui prenaient quatre hauteurs de
 * grille avant même d'atteindre les produits. Ici une ligne de 44 px, balayable au
 * doigt, avec le chip suivant dépasser du bord pour signaler qu'il y en a d'autres.
 *
 * Le ton (avertissement / danger) ne s'applique qu'aux chips INACTIFS : l'actif passe
 * toujours au vert de marque, sinon on ne sait plus jamais lequel est sélectionné.
 */
export function FilterChip({
  label,
  count,
  active,
  icon: Icon,
  tone = "default",
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  icon?: LucideIcon;
  tone?: ChipTone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-[12px] border px-3 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97]",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : tone === "danger"
            ? "border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10"
            : tone === "warning"
              ? "border-amber-500/25 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
      )}
    >
      {Icon && (
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary-foreground")} aria-hidden />
      )}
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 text-xs font-semibold tabular-nums",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Titre de section + rangée de chips. Le rangée défile seule : la page, elle, ne défile
 *  jamais horizontalement — un `overflow-x-auto` sur la rangée suffit. */
export function ChipRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-small text-muted-foreground">{title}</p>
      <div className="-mx-[var(--page-gutter)] flex gap-1.5 overflow-x-auto px-[var(--page-gutter)] pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}
