import {
  CircleAlert,
  Layers,
  LayoutGrid,
  Sparkles,
  Tag,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import type { Product } from "@/lib/db";
import { ChipRow, FilterChip } from "./FilterChip";
import type { StatusFilter } from "./stock-state";

/**
 * Filtres : deux rangées balayables, indépendantes mais combinables.
 *
 * Le filtrage, les compteurs et les handlers sont ceux d'avant : seuls la
 * présentation change. Les deux rangées sont distinctes, donc « stock faible »
 * + « Chaussures » se cumulent comme avant.
 */
export function StocksChipFilters({
  products,
  lowCount,
  outCount,
  statusFilter,
  onStatus,
  categoryFilter,
  onCategory,
}: {
  products: Product[];
  lowCount: number;
  outCount: number;
  statusFilter: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  categoryFilter: string | null;
  onCategory: (v: string | null) => void;
}) {
  const categories = new Map<string, number>();
  for (const p of products) categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
  const categoryList = [...categories.entries()].sort((a, b) => b[1] - a[1]);

  const serviceCount = products.filter((p) => p.type === "service").length;
  const statusChips: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: products.length },
    ...(serviceCount > 0
      ? [{ key: "service" as const, label: "Prestations", count: serviceCount }]
      : []),
    { key: "low", label: "Stock faible", count: lowCount },
    // « Rupture » ne prend la place que quand il y a DE quoi voir : alerter d'une
    // absence pour rien était du bruit dans la rangée de filtres.
    ...(outCount > 0 ? [{ key: "out" as const, label: "Rupture", count: outCount }] : []),
  ];
  const STATUS_ICON: Record<StatusFilter, LucideIcon> = {
    all: LayoutGrid,
    service: Sparkles,
    low: TrendingDown,
    out: CircleAlert,
  };

  return (
    <div className="space-y-4">
      <ChipRow title="État du stock">
        {statusChips.map(({ key, label, count }) => (
          <FilterChip
            key={key}
            label={label}
            count={count}
            active={statusFilter === key}
            icon={STATUS_ICON[key]}
            tone={key === "out" ? "danger" : key === "low" ? "warning" : "default"}
            onClick={() => onStatus(key)}
          />
        ))}
      </ChipRow>

      {categoryList.length > 1 && (
        <ChipRow title="Catégories">
          <FilterChip
            label="Toutes"
            count={products.length}
            active={categoryFilter === null}
            icon={Layers}
            onClick={() => onCategory(null)}
          />
          {categoryList.map(([cat, count]) => (
            <FilterChip
              key={cat}
              label={cat}
              count={count}
              active={categoryFilter === cat}
              icon={Tag}
              onClick={() => onCategory(categoryFilter === cat ? null : cat)}
            />
          ))}
        </ChipRow>
      )}
    </div>
  );
}
