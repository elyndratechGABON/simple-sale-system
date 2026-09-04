// Dialog « Activité » — suivi du personnel pour le propriétaire.
//
// Accessible depuis une icône du header (propriétaire uniquement). Trois volets :
//   1. CA par vendeur : chaque gérant/employé avec son nombre de ventes et son montant
//      encaissé sur la période. Les ventes d'une caisse propriétaire (aucun `seller_name`)
//      sont agrégées sous « Direct ».
//   2. Actions récentes : les ventes et ajustements de stock les plus récents, horodatés.
//   3. Caisses : l'état de chaque appareil du compte (rôle, dernier contact, connecté/à
//      approuver) — le registre des pairs.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Boxes,
  Clock,
  MonitorSmartphone,
  Receipt,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";
import { getSaleItemsForSales, listSales, listStockMovements } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import type { DeviceRole, PairedDevice } from "@/lib/syncengine/types";

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Début du mois courant (fenêtre par défaut). */
function monthStart(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Nom humain d'un vendeur sans nom posé. */
function sellerDisplay(name?: string, fallback: string = "Direct"): string {
  return name?.trim() ? name : fallback;
}

/** Dernier contact en texte relatif. */
function lastSeenLabel(ts?: number): string {
  if (!ts) return "Jamais";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return `Il y a ${Math.floor(diff / 86_400_000)} j`;
}

/** Badge coloré selon le rôle. */
function RoleBadge({ role }: { role?: DeviceRole }) {
  if (!role || role === "owner") {
    return (
      <Badge variant="default" className="bg-primary text-primary-foreground gap-1">
        <BadgeCheck className="h-3 w-3" />
        Propriétaire
      </Badge>
    );
  }
  if (role === "manager") {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 gap-1"
      >
        <UserCheck className="h-3 w-3" />
        Gérant
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      Employé
    </Badge>
  );
}

export function ActivityDialog({ open, onOpenChange }: ActivityDialogProps) {
  const [range, setRange] = useState<"month" | "week" | "day">("month");

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

  // CA agrégé par vendeur : `seller_name` absent = caisse propriétaire (Direct).
  const bySeller = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    for (const s of sales ?? []) {
      const label = sellerDisplay(s.seller_name);
      const cur = map.get(label) ?? { name: label, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += s.total;
      map.set(label, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const itemsCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items ?? []) map.set(it.sale_id, (map.get(it.sale_id) ?? 0) + it.quantity);
    return map;
  }, [items]);

  const totalRevenue = bySeller.reduce((s, b) => s + b.revenue, 0);
  const totalCount = bySeller.reduce((s, b) => s + b.count, 0);

  const paired = (peers ?? []).filter((p) => p.status !== "pending");
  const pending = (peers ?? []).filter((p) => p.status === "pending");
  const roleOrder: Record<string, number> = { owner: 0, manager: 1, employee: 2 };
  const sortedPeers = [...paired].sort(
    (a, b) => (roleOrder[a.role ?? "employee"] ?? 9) - (roleOrder[b.role ?? "employee"] ?? 9),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Activité du personnel
          </DialogTitle>
          <DialogDescription>
            Ventes et ajustements de chaque caisse, sur la période choisie.
          </DialogDescription>
        </DialogHeader>

        {/* Sélecteur de période */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { k: "day", label: "Aujourd'hui" },
              { k: "week", label: "7 jours" },
              { k: "month", label: "Ce mois" },
            ] as const
          ).map(({ k, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              className={[
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                range === k
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Total période */}
        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">Total encaissé</p>
            <p className="text-xl font-bold tabular-nums">{formatFCFA(totalRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Ventes</p>
            <p className="text-xl font-bold tabular-nums">{totalCount}</p>
          </div>
        </div>

        {/* CA par vendeur */}
        {bySeller.length > 0 ? (
          <div className="space-y-2">
            {bySeller.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.count} vente{b.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <p className="font-bold tabular-nums">{formatFCFA(b.revenue)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            Aucune vente sur cette période.
          </p>
        )}

        {/* Actions récentes */}
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Receipt className="h-4 w-4 text-primary" /> Ventes récentes
            </p>
            <div className="space-y-1.5">
              {(sales ?? []).slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {sellerDisplay(s.seller_name)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        · {itemsCount.get(s.id) ?? 0} art. ·{" "}
                        {new Date(s.timestamp).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{formatFCFA(s.total)}</span>
                </div>
              ))}
              {(sales ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune vente récente.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Boxes className="h-4 w-4 text-primary" /> Ajustements de stock
            </p>
            <div className="space-y-1.5">
              {(movements ?? []).slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {m.delta > 0 ? "+" : ""}
                      {m.delta} {m.product_name.slice(0, 14)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </div>
                  <span
                    className={
                      m.delta > 0
                        ? "shrink-0 font-medium text-emerald-600 tabular-nums"
                        : "shrink-0 font-medium text-red-600 tabular-nums"
                    }
                  >
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </span>
                </div>
              ))}
              {(movements ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun ajustement récent.</p>
              )}
            </div>
          </div>
        </div>

        {/* Caisses connectées */}
        <div className="space-y-2 border-t pt-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" /> Caisses connectées
          </p>
          {sortedPeers.length === 0 && pending.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucune autre caisse rencontrée pour l'instant. Ajoutez un appareil dans Réglages →
              Appareils.
            </p>
          ) : (
            <div className="space-y-1.5">
              {sortedPeers.map((p) => (
                <DeviceRow key={p.id} device={p} />
              ))}
              {pending.map((p) => (
                <DeviceRow key={p.id} device={p} pending />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeviceRow({ device, pending }: { device: PairedDevice; pending?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${pending ? "bg-amber-500" : "bg-emerald-500"}`}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{device.device_name || "Écran sans nom"}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MonitorSmartphone className="h-3 w-3" />
            {lastSeenLabel(device.last_seen)}
          </p>
        </div>
      </div>
      {pending ? <Badge variant="outline">À approuver</Badge> : <RoleBadge role={device.role} />}
    </div>
  );
}
