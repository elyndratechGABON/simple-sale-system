import { ArrowDownUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortKey } from "./stock-state";

/** Recherche + tri. Regroupés dans un seul `space-y-4` pour préserver l'espacement
 *  que le parent `space-y-4` appliquait à chacun des deux blocs. */
export function StocksSearchSort({
  search,
  onSearch,
  sortBy,
  onSort,
}: {
  search: string;
  onSearch: (v: string) => void;
  sortBy: SortKey;
  onSort: (v: SortKey) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          aria-label="Rechercher un produit"
          className="h-14 rounded-xl bg-card pl-11 md:text-base"
        />
      </div>

      <div>
        <Select value={sortBy} onValueChange={(v) => onSort(v as SortKey)}>
          <SelectTrigger className="h-14 w-full rounded-xl">
            <ArrowDownUp className="h-4 w-4 mr-1.5 shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Trier : Nom</SelectItem>
            <SelectItem value="stock_desc">Trier : Stock décroissant</SelectItem>
            <SelectItem value="stock">Trier : Stock</SelectItem>
            <SelectItem value="price">Trier : Prix</SelectItem>
            <SelectItem value="updated">Trier : Dernière modification</SelectItem>
            <SelectItem value="bestsellers">Trier : Plus vendus (30j)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
