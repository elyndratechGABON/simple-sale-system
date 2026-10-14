import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";
import { listProducts, bulkUpdateCost, type Product } from "@/lib/db";

function ProductRow({
  p,
  selected,
  toggle,
  formatFCFA,
  costDisplay,
  hasCost,
}: {
  p: Product;
  selected: Set<string>;
  toggle: (id: string) => void;
  formatFCFA: (cost: number) => string;
  costDisplay: (cost: number) => string;
  hasCost: (cost: number) => boolean;
}) {
  return (
    <tr
      key={p.id}
      className={
        hasCost(p.cost) ? "bg-orange-50/30 border-l-2 border-l-orange-400" : "hover:bg-muted/30"
      }
    >
      <td className="px-3 py-2 text-center">
        <Checkbox
          checked={selected.has(p.id)}
          onCheckedChange={() => toggle(p.id)}
          disabled={p.deleted_at !== undefined}
        />
      </td>
      <td className="px-3 py-2">
        <span className="font-medium truncate block">{p.name}</span>
        <span className="text-xs text-muted-foreground">{p.category}</span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatFCFA(p.price)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {costDisplay(p.cost)}
        {hasCost(p.cost) && (
          <AlertTriangle className="ml-1.5 h-3.5 w-3.5 text-orange-500 shrink-0" />
        )}
      </td>
    </tr>
  );
}

/** `initialSelected` est lu UNE fois, au montage : l'appelant doit changer la clé du
 *  composant quand il change la sélection, sinon l'ancienne resterait cochée. */
export function CostBatch({ initialSelected }: { initialSelected?: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected ?? []));
  const [search, setSearch] = useState("");
  const [applyCost, setApplyCost] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );

  const selectAll = useMemo(
    () => filteredProducts.length > 0 && filteredProducts.every((p) => selected.has(p.id)),
    [filteredProducts, selected],
  );

  const hasSelection = selected.size > 0;
  const costValue = Number(applyCost);
  const canApply = hasSelection && costValue >= 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.size === filteredProducts.length) {
        filteredProducts.forEach((p) => next.delete(p.id));
      } else {
        filteredProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  async function handleApply() {
    if (!canApply) return;
    const ids = Array.from(selected);
    try {
      const updated = await bulkUpdateCost(ids, costValue);
      toast.success(
        `${updated} produit${updated > 1 ? "s" : ""} mis à jour à ${formatFCFA(costValue)}`,
      );
      setSelected(new Set());
      setApplyCost("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    }
  }

  function costDisplay(cost: number): string {
    return cost > 0 ? formatFCFA(cost) : "—";
  }

  function hasCost(cost: number): boolean {
    return cost > 0;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="w-12 px-3 py-2 text-center">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="px-3 py-2 text-left">Produit</th>
                <th className="px-3 py-2 text-right">Prix</th>
                <th className="px-3 py-2 text-right">Coût actuel</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <ProductRow
                    key={p.id}
                    p={p}
                    selected={selected}
                    toggle={toggle}
                    formatFCFA={formatFCFA}
                    costDisplay={costDisplay}
                    hasCost={hasCost}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasSelection && (
          <div className="border-t bg-muted/30 px-3 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {selected.size} produit{selected.size > 1 ? "s" : ""} sélectionné
                {selected.size > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 sm:flex-row-reverse">
              <Input
                type="number"
                placeholder="Coût (FCFA)"
                value={applyCost}
                onChange={(e) => setApplyCost(e.target.value)}
                min={0}
                step={0.01}
                className="w-36 sm:w-44"
                inputMode="numeric"
              />
              <Button onClick={handleApply} disabled={!canApply}>
                Appliquer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
