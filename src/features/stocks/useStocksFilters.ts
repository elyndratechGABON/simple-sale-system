import { useMemo, useState } from "react";
import type { Product } from "@/lib/db";
import { stateOf, type SortKey, type StatusFilter } from "./stock-state";

/** Recherche / filtres / tri de la page Stocks, avec les dérivés associés
 *  (résumé, produits en difficulté, liste visible) regroupés au même endroit. */
export function useStocksFilters(products: Product[], soldQtyByProduct: Map<string, number>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const stats = useMemo(() => {
    let value = 0;
    let low = 0;
    let out = 0;
    for (const p of products) {
      if (stateOf(p) === "service") continue;
      if (Number.isFinite(p.stock)) value += p.price * p.stock;
      const state = stateOf(p);
      if (state === "out") out += 1;
      else if (state === "low") low += 1;
    }
    return { value, low, out };
  }, [products]);

  // Produits en difficulté : ruptures d'abord, puis stock faible.
  const attention = useMemo(
    () =>
      products
        .filter((p) => {
          const s = stateOf(p);
          return s === "out" || s === "low";
        })
        .sort((a, b) => (stateOf(a) === "out" ? -1 : 1) - (stateOf(b) === "out" ? -1 : 1)),
    [products],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q))
        return false;
      if (statusFilter !== "all") {
        const s = stateOf(p);
        // « Prestations » cible le TYPE, pas l'état : un produit à stock illimité
        // n'est pas une prestation.
        if (statusFilter === "service" && p.type !== "service") return false;
        if (statusFilter === "low" && s !== "low") return false;
        if (statusFilter === "out" && s !== "out") return false;
      }
      if (categoryFilter && p.category !== categoryFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "stock_desc":
          if (!Number.isFinite(a.stock)) return 1;
          if (!Number.isFinite(b.stock)) return -1;
          return b.stock - a.stock;
        case "stock":
          if (!Number.isFinite(a.stock)) return 1;
          if (!Number.isFinite(b.stock)) return -1;
          return a.stock - b.stock;
        case "price":
          return b.price - a.price;
        case "updated":
          return b.updated_at - a.updated_at;
        case "bestsellers":
          return (soldQtyByProduct.get(b.id) ?? 0) - (soldQtyByProduct.get(a.id) ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [products, search, statusFilter, categoryFilter, sortBy, soldQtyByProduct]);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    stats,
    attention,
    visible,
  };
}
