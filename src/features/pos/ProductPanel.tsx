import { Search, Scissors, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CategoryCard, FilterChip } from "@/components/pos";
import { POSProductCard } from "@/components/POSProductCard";
import { cn } from "@/lib/utils";
import { PopularStrip } from "./PopularStrip";
import { EmptyCatalog } from "./EmptyCatalog";
import type { PosController } from "./usePos";
import type { Product } from "@/lib/db";

/** Colonne centrale : titre, recherche, catégories, produits du jour, grille. */
export function ProductPanel({
  pos,
  onProductSelect,
}: {
  pos: PosController;
  /** Tap alternatif : le sélecteur de table ajoute au panier de la table, pas à celui du comptoir. */
  onProductSelect?: (product: Product) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      {/* Titre seul sur sa ligne en mobile ; les catégories passent dans leur propre
          rangée scrollable (chip-row) au lieu de pousser le titre. */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold sm:text-xl">
          {pos.isService
            ? pos.serviceTab === "prestations"
              ? "Prestations"
              : "Produits"
            : "Articles"}
        </h2>
        {pos.isService && (
          <div className="flex gap-1">
            <FilterChip
              active={pos.serviceTab === "prestations"}
              onClick={() => pos.setServiceTab("prestations")}
            >
              <Scissors className="h-3.5 w-3.5 mr-1" /> Prestations
            </FilterChip>
            <FilterChip
              active={pos.serviceTab === "produits"}
              onClick={() => pos.setServiceTab("produits")}
            >
              <Package className="h-3.5 w-3.5 mr-1" /> Produits
            </FilterChip>
          </div>
        )}
      </div>
      {/* Recherche : la grille se resserre pendant la frappe (même recette que Stocks). */}
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={pos.search}
          onChange={(e) => pos.setSearch(e.target.value)}
          placeholder="Rechercher un article…"
          aria-label="Rechercher un article"
          className="h-12 rounded-xl pl-9"
        />
      </div>
      {/* Catégories : grille de cartes sous 1280 px. Au-dessus, elles vivent dans la
          colonne de gauche (xl:block) — sinon ce sont deux fois les mêmes boutons. */}
      {!pos.isService && pos.categories.length > 0 && (
        <section className="mt-4 xl:hidden">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Catégories
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 xs:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 xl:gap-3">
            <CategoryCard
              label="Tous"
              active={pos.filter === "Tous"}
              onClick={() => pos.setFilter("Tous")}
            />
            {pos.categories.map((c) => (
              <CategoryCard
                key={c}
                label={c}
                active={pos.filter === c}
                onClick={() => pos.setFilter(c)}
              />
            ))}
          </div>
        </section>
      )}
      <PopularStrip pos={pos} onProductSelect={onProductSelect} />
      <div
        className={cn(
          "mt-5 grid gap-2.5 xs:gap-3",
          // Sous 1280, la grille occupe toute la largeur. Au-dessus, elle vit dans la
          // colonne centrale entre Catégories et Panier — donc elle perd une colonne.
          pos.hasTables
            ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5",
        )}
      >
        {pos.filtered.map((p) => {
          const inCart = Object.entries(pos.cart)
            .filter(([k]) => k === p.id || k.startsWith(`${p.id}::`))
            .reduce((s, [, e]) => s + e.qty, 0);
          return (
            <POSProductCard
              key={p.id}
              product={p}
              inCart={inCart}
              onAdd={onProductSelect ?? pos.onProductClick}
              // Appui long = saisie manuelle de la quantité. C'est le seul geste de
              // « gestion » que la caisse garde : ouvrir une fiche ferait perdre la vente.
              onLongPress={(prod) => {
                pos.setManualQtyProduct(prod);
                pos.setManualQtyValue(String(pos.cart[prod.id]?.qty ?? 1));
                pos.setManualQtyOpen(true);
              }}
            />
          );
        })}
      </div>
      {pos.products.length > 0 && pos.filtered.length === 0 && (
        <p className="mt-3 py-10 text-center text-sm text-muted-foreground">
          Aucun article ne correspond à la recherche.
        </p>
      )}
      <EmptyCatalog pos={pos} />
    </div>
  );
}
