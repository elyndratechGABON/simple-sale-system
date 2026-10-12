// Pastilles de la caisse : la destination (comptoir ou table ouverte) et les filtres
// (catégorie). Deux composants voisins qui n'ont rien d'autre en commun que d'être de
// petites cibles tactiles — d'où un seul fichier plutôt que deux.

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Store } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Pastille de destination : le comptoir, ou une table ouverte avec son addition. */
export function TargetChip({
  active,
  onClick,
  icon: Icon,
  label,
  amount,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Store;
  label: string;
  amount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:border-primary hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {amount !== undefined && amount > 0 && (
        <span className={cn("tabular-nums", active ? "opacity-90" : "text-muted-foreground")}>
          · {formatFCFA(amount)}
        </span>
      )}
    </button>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // `min-h-11` = 44 px, le minimum tactile. Une pastille de 30 px se manque une fois
        // sur trois avec un pouce, et ces filtres se touchent en plein service.
        "min-h-11 rounded-full border px-4 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
