import { CategoryRail } from "@/components/pos";
import type { PosController } from "./usePos";

/**
 * Colonne Catégories (≥1280 px). `sticky` + défilement interne : la liste suit la page
 * sans faire défiler toute la fenêtre. Sous 1280 px, la grille de cartes la remplace
 * (cf. ProductPanel).
 */
export function CategoriesColumn({ pos }: { pos: PosController }) {
  if (pos.isService || pos.categories.length === 0) return null;
  return (
    <aside className="hidden xl:block">
      <section className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Catégories
        </p>
        <div className="space-y-1">
          <CategoryRail
            label="Tous"
            active={pos.filter === "Tous"}
            onClick={() => pos.setFilter("Tous")}
          />
          {pos.categories.map((c) => (
            <CategoryRail
              key={c}
              label={c}
              active={pos.filter === c}
              onClick={() => pos.setFilter(c)}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}
