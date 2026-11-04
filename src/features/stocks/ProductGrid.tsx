import {
  History,
  MoreVertical,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Product } from "@/lib/db";
import type { ProductCardField } from "@/lib/card-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductCard } from "@/components/ProductCard";
import { VirtualizedGrid } from "@/components/VirtualizedGrid";
import { stateOf } from "./stock-state";
/** Liste des produits : états vides, ligne de compte, grille et menu d'actions. */
export function ProductGrid({
  products,
  visible,
  cardFields,
  lastSoldAtByProduct,
  isLoading,
  onOpenProduct,
  onAddStock,
  onRemoveStock,
  onEdit,
  onMovements,
  onDelete,
}: {
  products: Product[];
  visible: Product[];
  cardFields: ProductCardField[];
  lastSoldAtByProduct: Map<string, number>;
  onOpenProduct: (id: string) => void;
  onAddStock: (p: Product) => void;
  onRemoveStock: (p: Product) => void;
  onEdit: (p: Product) => void;
  onMovements: (p: Product) => void;
  onDelete: (p: Product) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flat-card space-y-2 p-3" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (visible.length === 0) {
    return (
      <p className="py-10 text-center text-body text-muted-foreground">
        Aucun produit ne correspond à la recherche ou aux filtres.
      </p>
    );
  }
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-small text-muted-foreground">Produits</p>
        <p className="text-body tabular-nums text-muted-foreground">
          {visible.length}
          {visible.length < products.length && ` sur ${products.length}`}
        </p>
      </div>
      <VirtualizedGrid
        items={visible}
        itemKey={(p) => p.id}
        rowClass="grid grid-cols-2 gap-x-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        gapYClass="pb-2"
        renderItem={(p) => {
          const state = stateOf(p);
          const isServiceItem = state === "service";
          return (
            <ProductCard
              key={p.id}
              product={p}
              fields={cardFields}
              state={state}
              lastSoldAt={lastSoldAtByProduct.get(p.id)}
              onOpen={() => onOpenProduct(p.id)}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Actions sur ${p.name}`}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!isServiceItem && Number.isFinite(p.stock) && (
                      <>
                        <DropdownMenuItem onClick={() => onAddStock(p)}>
                          <PackagePlus className="h-4 w-4 mr-2" /> Ajouter du stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRemoveStock(p)}>
                          <PackageMinus className="h-4 w-4 mr-2" /> Retirer du stock
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(p)}>
                      <Pencil className="h-4 w-4 mr-2" /> Modifier
                    </DropdownMenuItem>
                    {/* Journal du produit : la page affiche déjà l'historique
                      global, mais depuis une fiche on veut les mouvements de
                      CET article. Même source, filtre par produit. */}
                    <DropdownMenuItem onClick={() => onMovements(p)}>
                      <History className="h-4 w-4 mr-2" /> Voir le journal
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(p)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          );
        }}
      />
    </>
  );
}
