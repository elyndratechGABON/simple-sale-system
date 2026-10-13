// Stocks & Produits — centre de pilotage du stock, pas une simple liste.
//
// Résumé chiffré en tête (valeur, volumes, alertes), recherche/filtres/tri, bloc
// d'attention, puis fiche produit compacte avec jauge de stock et actions rapides
// (réapprovisionner, corriger, modifier, supprimer). Le journal des mouvements répond
// au « pourquoi ce stock a baissé ? » — chaque variation est écrite par src/lib/db.ts,
// la page ne fait que le lire.
import { Package } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { useStocksData } from "./useStocksData";
import { useStocksFilters } from "./useStocksFilters";
import { useStocksDialogs } from "./useStocksDialogs";
import { stateOf } from "./stock-state";
import { StocksSummary } from "./StocksSummary";
import { StocksActions } from "./StocksActions";
import { StocksSearchSort } from "./StocksSearchSort";
import { StocksChipFilters } from "./StocksChipFilters";
import { AttentionBanner } from "./AttentionBanner";
import { ProductGrid } from "./ProductGrid";
import { StocksDialogs } from "./StocksDialogs";

export function StocksPage() {
  const prefs = usePreferences();
  const isService = prefs.cluster === "service";
  // Champs visibles sur les cards (§10). La liste est ordonnée : l'ordre du tableau
  // est l'ordre d'affichage. Relue de localStorage via les préférences, donc le
  // réglage survit à un redémarrage (§29).
  const cardFields = prefs.stockCardFields;

  const { products, soldQtyByProduct, lastSoldAtByProduct } = useStocksData();
  const filters = useStocksFilters(products, soldQtyByProduct);
  const dialogs = useStocksDialogs();

  return (
    <div className="app-container">
      <div className="mx-auto w-full max-w-[1280px] space-y-4 py-4">
        {/* ── En-tête ─────────────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-page-title font-bold">
            <Package className="h-6 w-6 shrink-0" /> Stock & Produits
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos produits, vos quantités et vos réapprovisionnements.
          </p>
        </div>

        <StocksSummary
          value={filters.stats.value}
          productCount={products.length}
          low={filters.stats.low}
          out={filters.stats.out}
        />

        <StocksActions
          isService={isService}
          onAdd={() => dialogs.openAddStock(null)}
          onJournal={dialogs.openJournal}
          onCreate={dialogs.openCreate}
          onPrestation={dialogs.openPrestation}
        />

        <StocksSearchSort
          search={filters.search}
          onSearch={filters.setSearch}
          sortBy={filters.sortBy}
          onSort={filters.setSortBy}
        />

        <StocksChipFilters
          products={products}
          lowCount={filters.stats.low}
          outCount={filters.stats.out}
          statusFilter={filters.statusFilter}
          onStatus={filters.setStatusFilter}
          categoryFilter={filters.categoryFilter}
          onCategory={filters.setCategoryFilter}
        />

        {filters.attention.length > 0 && filters.statusFilter === "all" && (
          <AttentionBanner
            count={filters.attention.length}
            onClick={() =>
              filters.setStatusFilter(
                filters.attention.some((p) => stateOf(p) === "low") ? "low" : "out",
              )
            }
          />
        )}

        <ProductGrid
          products={products}
          visible={filters.visible}
          cardFields={cardFields}
          lastSoldAtByProduct={lastSoldAtByProduct}
          onOpenProduct={dialogs.setDetailId}
          onAddStock={dialogs.openAddStock}
          onRemoveStock={dialogs.setRemoveTarget}
          onEdit={dialogs.openEdit}
          onMovements={dialogs.openMovements}
          onDelete={dialogs.setDeleteTarget}
        />

        <StocksDialogs
          dialogs={dialogs}
          products={products}
          isService={isService}
          lastSoldAtByProduct={lastSoldAtByProduct}
        />
      </div>
    </div>
  );
}
