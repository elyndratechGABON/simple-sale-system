import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSaleItemsForSales, listSales, listStockMovements } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { monthStart } from "./helpers";

export type Range = "month" | "week" | "day";

/**
 * Données de la fiche Équipe — l'interface unique du personnel : le registre des pairs
 * (ce hook n'attribue rien), les ventes de la période, les ajustements récents.
 * `open` évite tout travail quand le dialogue est fermé. `listPairedDevices` exclut
 * l'écran courant : la ligne « Cette caisse » est reconstruite côté `TeamDialog`.
 */
export function useActivityData(open: boolean) {
  const [range, setRange] = useState<Range>("month");

  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    enabled: open,
  });
  const { data: peers } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    enabled: open && Boolean(identity),
    staleTime: 10_000,
  });

  const from =
    range === "day"
      ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
      : range === "week"
        ? Date.now() - 7 * 86400_000
        : monthStart();

  const { data: sales } = useQuery({
    queryKey: ["activity_sales", from],
    queryFn: () => listSales(from, Date.now()),
    enabled: open,
    staleTime: 10_000,
  });
  const { data: movements } = useQuery({
    queryKey: ["activity_movements"],
    queryFn: () => listStockMovements({ limit: 20 }),
    enabled: open,
    staleTime: 10_000,
  });
  const { data: items } = useQuery({
    queryKey: ["activity_items", sales?.map((s) => s.id)],
    queryFn: () => getSaleItemsForSales((sales ?? []).map((s) => s.id)),
    enabled: open && Boolean(sales),
    staleTime: 30_000,
  });

  const itemsCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items ?? []) map.set(it.sale_id, (map.get(it.sale_id) ?? 0) + it.quantity);
    return map;
  }, [items]);

  const totalRevenue = (sales ?? []).reduce((sum, s) => sum + s.total, 0);
  const totalCount = (sales ?? []).length;

  const paired = (peers ?? []).filter((p) => p.status !== "pending");
  const pending = (peers ?? []).filter((p) => p.status === "pending");
  const roleOrder: Record<string, number> = { owner: 0, employee: 1 };
  const sortedPeers = [...paired].sort(
    (a, b) => (roleOrder[a.role ?? "employee"] ?? 9) - (roleOrder[b.role ?? "employee"] ?? 9),
  );

  return {
    identity,
    range,
    setRange,
    sales,
    movements,
    itemsCount,
    totalRevenue,
    totalCount,
    sortedPeers,
    paired,
    pending,
  };
}
