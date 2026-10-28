import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Product } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { stateOf } from "./stock-state";

/** Sélecteur de produit du dialogue d'ajout de stock : recherche + liste. */
export function StockPicker({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const list = useMemo(
    () =>
      products
        .filter((p) => Number.isFinite(p.stock))
        .filter(
          (p) =>
            !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase()),
        ),
    [products, search],
  );

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          className="pl-9 pr-12 h-11 rounded-xl bg-muted/50 border-none focus:border-none focus-visible:ring-primary/30"
          autoFocus
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
        {list.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Aucun produit trouvé.</p>
        ) : (
          list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                "hover:border-primary/50 hover:bg-accent/50",
              )}
            >
              <div className="min-w-0 flex-1 flex items-center gap-2.5">
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-md border object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.category} · {formatFCFA(p.price)}
                  </p>
                </div>
              </div>
              <Badge
                variant={stateOf(p) === "ok" ? "secondary" : "destructive"}
                className="ml-2 shrink-0 tabular-nums"
              >
                Stock : {p.stock}
              </Badge>
            </button>
          ))
        )}
      </div>
    </>
  );
}
