import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Calculator } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFCFA } from "@/lib/format";
import { bulkUpdateCost, listProducts, type Product } from "@/lib/db";
import { CostBatchRow } from "./CostBatchRow";
import { CostSummaryDialog } from "./CostSummaryDialog";

type Filter = "all" | "with" | "without";

/** `initialSelected` est lu UNE fois, au montage : l'appelant doit changer la clé du
 *  composant quand il change la sélection, sinon l'ancienne resterait cochée. */
export function CostBatch({ initialSelected }: { initialSelected?: string[] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Ce qu'on a DÉcoché, et non ce qu'on a coché : les produits arrivent en asynchrone,
  // une sélection stockée dans un useState serait figée à vide puis jamais mise à jour.
  // `initialSelected` reste prioritaire — c'est lui qui arrive de l'alerte « sans coût ».
  const [unpicked, setUnpicked] = useState<Set<string>>(new Set());

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: listProducts });

  const selectedIds = useMemo(() => {
    const ids = new Set(initialSelected ?? products.map((p) => p.id));
    for (const id of unpicked) ids.delete(id);
    return ids;
  }, [initialSelected, products, unpicked]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return products.filter((p) => {
      if (needle !== "" && !p.name.toLowerCase().includes(needle)) return false;
      if (filter === "with") return p.cost > 0;
      if (filter === "without") return p.cost <= 0;
      return true;
    });
  }, [products, search, filter]);

  const selected = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  function toggle(id: string) {
    setUnpicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveCost(id: string, cost: number) {
    const product = products.find((p) => p.id === id);
    try {
      await bulkUpdateCost([id], cost);
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${product?.name ?? "Produit"} : coût ${formatFCFA(cost)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Coût non enregistré");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          aria-label="Rechercher un produit"
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">Tout</TabsTrigger>
          <TabsTrigger value="with">Avec coût</TabsTrigger>
          <TabsTrigger value="without">Sans coût</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border overflow-hidden">
        <div className="max-h-[50vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr className="border-b">
                <th className="w-12 px-3 py-2">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))}
                    onCheckedChange={() =>
                      setUnpicked((prev) => {
                        const next = new Set(prev);
                        const allPicked = filtered.every((p) => selectedIds.has(p.id));
                        filtered.forEach((p) => (allPicked ? next.add(p.id) : next.delete(p.id)));
                        return next;
                      })
                    }
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="px-3 py-2 text-left">Produit</th>
                <th className="px-3 py-2 text-right">Prix</th>
                <th className="px-3 py-2 text-right">Coût unitaire</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    Aucun produit
                  </td>
                </tr>
              ) : (
                filtered.map((p: Product) => (
                  <CostBatchRow
                    key={p.id}
                    product={p}
                    selected={selectedIds.has(p.id)}
                    onToggle={() => toggle(p.id)}
                    onSave={saveCost}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-3 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {selected.length} produit{selected.length > 1 ? "s" : ""} sélectionné
            {selected.length > 1 ? "s" : ""}
          </span>
          <Button disabled={selected.length === 0} onClick={() => setSummaryOpen(true)}>
            <Calculator className="h-4 w-4 mr-1.5" /> Calculer ({selected.length})
          </Button>
        </div>
      </div>

      <CostSummaryDialog open={summaryOpen} onOpenChange={setSummaryOpen} products={selected} />
    </div>
  );
}
