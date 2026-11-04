import { Search, Scissors, Package, Plus, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/pos";
import { POSProductCard } from "@/components/POSProductCard";
import { VirtualizedGrid } from "@/components/VirtualizedGrid";
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
  // Rangée catégories dépliée : toutes les puces affichées (le « + » bascule).
  const [moreOpen, setMoreOpen] = useState(false);
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
      {/* Recherche + catégories EN LIGNE (mission PC) : l'input fluide (flex-1,
          grille resserre au silence de frappe, debounce 300 ms) ; les catégories
          vivent À SA DROITE en chips qui défilent horizontalement ; le bouton « + »
          déplie la liste complète quand ça déborde. La colonne dédiée et son
          bouton de repli ont été supprimés. */}
      <div className="mt-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={pos.search}
            onChange={(e) => pos.setSearch(e.target.value)}
            placeholder="Rechercher un article…"
            aria-label="Rechercher un article"
            className="h-11 rounded-xl pl-9 pr-10 bg-muted/50 focus:ring-2 focus:ring-primary"
          />
        </div>
        {!pos.isService && pos.categories.length > 0 && (
          <>
            {/* Chips : défilement horizontal (pas de wrap) — la rangée reste UNE
                ligne, la recherche garde toute sa largeur utile. */}
            <div className="flex max-w-[42%] shrink-0 items-center gap-1.5 overflow-x-hidden">
              <FilterChip active={pos.filter === "Tous"} onClick={() => pos.setFilter("Tous")}>
                Tous
              </FilterChip>
              {pos.categories.slice(0, 4).map((c) => (
                <FilterChip key={c} active={pos.filter === c} onClick={() => pos.setFilter(c)}>
                  {c}
                </FilterChip>
              ))}
            </div>
            {/* « + » : déplié, TOUTES les catégories (y compris celles cachées par
                la troncature de la rangée) s'affichent en wrap sous la recherche. */}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-label={
                moreOpen ? "Masquer toutes les catégories" : "Afficher toutes les catégories"
              }
              title={moreOpen ? "Masquer les catégories" : "Voir toutes les catégories"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {moreOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
      {moreOpen && !pos.isService && pos.categories.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <FilterChip active={pos.filter === "Tous"} onClick={() => pos.setFilter("Tous")}>
            Tous
          </FilterChip>
          {pos.categories.map((c) => (
            <FilterChip key={c} active={pos.filter === c} onClick={() => pos.setFilter(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
      )}
      <PopularStrip pos={pos} onProductSelect={onProductSelect} />
      {/* Container Queries (Tailwind v4, mission responsive) : le nombre de colonnes
          suit la LARGEUR DU CONTENEUR, pas l'écran — une modale de table étroite
          reste en 2 colonnes même sur tablette ; l'écran plein écran s'élargit. */}
      <div className="@container mt-5">
        {/* Virtualisée (règle #23) : seules les lignes visibles sont rendues — le DOM
            de la grille ne grandit plus avec le catalogue, le scroll reste fluide. */}
        <VirtualizedGrid
          items={pos.filtered}
          itemKey={(p) => p.id}
          rowClass={cn(
            // Densité maîtrisée (mission responsive PC) : 2 mobile, 3 tablette,
            // 4 MAX sur desktop — JAMAIS 5 : la grille devient illisible (prix
            // coupé, noms en 4 caractères) et la carte ressemble à une bande.
            "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4",
          )}
          gapYClass="pb-3 lg:pb-4"
          renderItem={(p) => {
            const inCart = Object.entries(pos.cart)
              .filter(([k]) => k === p.id || k.startsWith(`${p.id}::`))
              .reduce((s, [, e]) => s + e.qty, 0);
            return (
              <POSProductCard
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
          }}
        />
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
