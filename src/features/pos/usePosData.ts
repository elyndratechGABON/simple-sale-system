import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getSaleItems,
  getSaleItemsForSales,
  listOpenTables,
  listProducts,
  listSalesToday,
  type Category,
  type Product,
  type SaleItem,
} from "@/lib/db";
import { usePreferences } from "@/hooks/use-preferences";
import type { Target } from "@/lib/pos/types";

/**
 * Données de la caisse : requêtes React Query et projections pures.
 * `target` ne sert qu'à résoudre la table active — jamais recopiée dans l'état local.
 */
export function usePosData(target: Target) {
  const { cluster, tables: tableLabels, features } = usePreferences();
  const isService = cluster === "service";
  const hasTables = features?.tables ?? (cluster === "restaurant" || cluster === "bar");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  // Le préfixe ["sales"] est déjà invalidé par toutes les mutations de vente — rien de
  // plus à câbler, cf. src/hooks/use-period-data.ts.
  const { data: openTables = [] } = useQuery({
    queryKey: ["sales", "open"],
    queryFn: listOpenTables,
  });

  // Ventes réglées du jour : alimentent les raccourcis « produits du jour », le mini-historique
  // et le dialogue de clôture de fin de service (déclenché depuis leurs écrans dédiés).
  const { data: salesToday = [] } = useQuery({
    queryKey: ["sales", "today"],
    queryFn: listSalesToday,
    refetchInterval: 10_000, // Auto-refresh toutes les 10s
  });
  const todayTotal = salesToday.reduce((s, x) => s + x.total, 0);

  // Table DÉRIVÉE de la liste des additions ouvertes, jamais copiée dans l'état local :
  // une table encaissée ou annulée disparaît de la liste, `activeTable` retombe à null et
  // l'écran revient de lui-même au comptoir.
  const activeTable = useMemo(
    () =>
      target.kind === "table" ? (openTables.find((t) => t.id === target.saleId) ?? null) : null,
    [target, openTables],
  );

  const { data: tableItems = [] } = useQuery({
    queryKey: ["sale_items", activeTable?.id],
    queryFn: () => getSaleItems(activeTable!.id),
    enabled: activeTable !== null,
  });

  const categories = useMemo(() => {
    const s = new Set<Category>();
    products.forEach((p) => s.add(p.category));
    return Array.from(s);
  }, [products]);

  // Lignes de vente du jour, pour la bande « Souvent achetés » : quelques lignes lues en
  // mémoire par vente, jamais plus lourdes que la vue des ventes récentes.
  const { data: todayItems = [] } = useQuery({
    queryKey: ["sale_items", "popular", salesToday.map((s) => s.id).join(",")],
    queryFn: () => getSaleItemsForSales(salesToday.map((s) => s.id)),
    enabled: salesToday.length > 0,
  });

  // Les produits les plus vendus aujourd'hui, triés par quantité décroissante. Les lignes
  // libres (product_id absent) et les produits supprimés (sortis du catalogue) sont écartés.
  const popular = useMemo(() => {
    const qty = new Map<string, number>();
    for (const it of todayItems) {
      if (!it.product_id) continue;
      qty.set(it.product_id, (qty.get(it.product_id) ?? 0) + it.quantity);
    }
    const byProduct = new Map(products.map((p) => [p.id, p]));
    return Array.from(qty.entries())
      .map(([id, q]) => ({ product: byProduct.get(id), amount: q }))
      .filter((x) => x.product)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map((x) => x.product as Product);
  }, [todayItems, products]);

  /**
   * Le plan de salle : les tables des Réglages, PLUS toute table ouverte dont le libellé
   * n'y figure plus. Sans cette union, retirer « Terrasse 1 » des Réglages pendant qu'elle
   * est occupée la ferait disparaître de l'écran avec son addition.
   */
  const floorPlan = useMemo(() => {
    const byLabel = new Map(openTables.map((t) => [t.table, t]));
    const labels = [
      ...tableLabels,
      ...openTables.map((t) => t.table!).filter((l) => !tableLabels.includes(l)),
    ];
    return labels.map((label) => ({ label, table: byLabel.get(label) ?? null }));
  }, [tableLabels, openTables]);

  /** Tournées passées de l'addition, groupées par heure de commande, la plus ancienne d'abord. */
  const rounds = useMemo(() => {
    const map = new Map<number, SaleItem[]>();
    for (const item of tableItems) {
      // `ordered_at` est absent des lignes écrites avant les tables : elles forment alors
      // une seule tournée, ce qui est exact — c'était une vente en un passage.
      const key = item.ordered_at ?? 0;
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [tableItems]);

  return {
    isService,
    hasTables,
    tableLabels,
    products,
    openTables,
    salesToday,
    todayTotal,
    activeTable,
    categories,
    popular,
    floorPlan,
    rounds,
  };
}
