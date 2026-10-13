import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSaleItemsForSales, listSales, listStockMovements } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { monthStart, sellerDisplay } from "./helpers";

export type Range = "month" | "week" | "day";

export interface SellerRevenueItem {
  key: string;
  nom: string;
  phone: string;
  estMoi: boolean;
  count: number;
  revenue: number;
}

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

  // CA agrégé par ÉCRAN, trié du plus gros au plus petit. La clé est `seller_device_id`
  // (posé à la vente par l'écran qui encaisse) : deux employés anonymes ne se confondent
  // donc plus en une seule ligne « Employé ». Le libellé vient du registre des pairs, et
  // le numéro d'y est aussi — c'est ce que le patron cherche ici.
  const moi = identity?.deviceId;
  const parVendeur = useMemo(() => {
    const peerById = new Map((peers ?? []).map((p) => [p.id, p]));
    const map = new Map<string, SellerRevenueItem>();
    for (const s of sales ?? []) {
      const key = s.seller_device_id ?? "direct";
      const peer = peerById.get(key);
      const cur = map.get(key) ?? {
        key,
        nom:
          key === "direct"
            ? "Ventes directes"
            : peer?.device_name?.trim() || sellerDisplay(s.seller_name, "Employé sans nom"),
        phone: peer?.phone?.trim() ?? "",
        estMoi: key === moi,
        count: 0,
        revenue: 0,
      };
      cur.count += 1;
      cur.revenue += s.total;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [sales, peers, moi]);

  const itemsCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items ?? []) map.set(it.sale_id, (map.get(it.sale_id) ?? 0) + it.quantity);
    return map;
  }, [items]);

  const totalRevenue = parVendeur.reduce((s, b) => s + b.revenue, 0);
  const totalCount = parVendeur.reduce((s, b) => s + b.count, 0);

  const paired = (peers ?? []).filter((p) => p.status !== "pending");
  const pending = (peers ?? []).filter((p) => p.status === "pending");
  const roleOrder: Record<string, number> = { owner: 0, employee: 1 };
  const sortedPeers = [...paired].sort(
    (a, b) => (roleOrder[a.role ?? "employee"] ?? 9) - (roleOrder[b.role ?? "employee"] ?? 9),
  );

  return {
    range,
    setRange,
    sales,
    movements,
    itemsCount,
    parVendeur,
    totalRevenue,
    totalCount,
    sortedPeers,
    pending,
  };
}
