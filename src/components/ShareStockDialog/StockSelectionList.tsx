import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/db";

interface StockSelectionListProps {
  /** Produits déjà filtrés par la recherche du parent. */
  products: Product[];
  selectedIds: string[];
  search: string;
  onSearch: (value: string) => void;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export function StockSelectionList({
  products,
  selectedIds,
  search,
  onSearch,
  onToggle,
  onSelectAll,
  onClear,
}: StockSelectionListProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Filtrer par nom ou catégorie"
            className="pl-8"
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onSelectAll}>
          Tout cocher
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClear}>
          Tout décocher
        </Button>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1">
        {products.map((p) => {
          const actif = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  actif
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                ].join(" ")}
              >
                {actif && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {p.category}
              </Badge>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {Number.isFinite(p.stock) ? p.stock : "∞"}
              </span>
            </button>
          );
        })}
        {products.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Aucun produit à ce filtre.
          </p>
        )}
      </div>
    </div>
  );
}
