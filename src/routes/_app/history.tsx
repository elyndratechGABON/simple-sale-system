import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { History, ChevronDown, ChevronUp, User, X } from "lucide-react";
import {
  cancelSale,
  getSaleItems,
  getSaleItemsForSales,
  isClosed,
  listSales,
  type Sale,
} from "@/lib/db";
import { lineProfit } from "@/lib/analytics";
import { formatDay, formatFCFA, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { verifyPin } from "@/lib/pin";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  head: () => ({
    meta: [
      { title: "Historique des ventes — Caisse POS" },
      {
        name: "description",
        content: "Toutes les ventes enregistrées, groupées par jour, avec annulation.",
      },
    ],
  }),
  component: HistoryPage,
});

const ALL = "__all";
const COUNTER = "__counter";

const scopeLabel = (scope: string) =>
  scope === ALL ? "Toutes" : scope === COUNTER ? "Comptoir" : `Table ${scope}`;

type Period = "day" | "week" | "month" | "year";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

const bucketStart: Record<Period, (ts: number) => number> = {
  day: (ts) => startOfDay(ts).getTime(),
  week: (ts) => startOfWeek(ts, { weekStartsOn: 1 }).getTime(),
  month: (ts) => startOfMonth(ts).getTime(),
  year: (ts) => startOfYear(ts).getTime(),
};

function bucketLabel(period: Period, start: number): string {
  switch (period) {
    case "day":
      return formatDay(start);
    case "week":
      return `Sem. du ${new Date(start).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      })}`;
    case "month":
      return new Date(start).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    case "year":
      return String(new Date(start).getFullYear());
  }
}

function HistoryPage() {
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", "all"],
    queryFn: () => listSales(),
  });

  const [scope, setScope] = useState<string>(ALL);

  const scopes = useMemo(() => {
    const labels = new Set<string>();
    let comptoir = false;
    for (const s of sales) {
      if (s.table) labels.add(s.table);
      else comptoir = true;
    }
    return [
      ALL,
      ...(comptoir ? [COUNTER] : []),
      ...Array.from(labels).sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
    ];
  }, [sales]);

  const filtered = useMemo(() => {
    if (scope === ALL) return sales;
    if (scope === COUNTER) return sales.filter((s) => !s.table);
    return sales.filter((s) => s.table === scope);
  }, [sales, scope]);

  // Profit par vente — chargé uniquement pour les ventes filtrées
  const { data: periodItems } = useQuery({
    queryKey: ["sale_items", "history", scope, filtered.map((s) => s.id).join(",")],
    queryFn: () => getSaleItemsForSales(filtered.map((s) => s.id)),
    enabled: filtered.length > 0,
  });

  const profitBySale = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of periodItems ?? []) {
      map.set(item.sale_id, (map.get(item.sale_id) ?? 0) + lineProfit(item));
    }
    return map;
  }, [periodItems]);

  const total = filtered.reduce((s, x) => s + x.total, 0);

  const [period, setPeriod] = useState<Period>("day");
  const [picked, setPicked] = useState<number | null>(null);

  const buckets = useMemo(() => {
    const map = new Map<number, { total: number; count: number; profit: number }>();
    for (const s of filtered) {
      const key = bucketStart[period](s.timestamp);
      const bucket = map.get(key);
      if (bucket) {
        bucket.total += s.total;
        bucket.count += 1;
        bucket.profit += profitBySale.get(s.id) ?? 0;
      } else {
        map.set(key, {
          total: s.total,
          count: 1,
          profit: profitBySale.get(s.id) ?? 0,
        });
      }
    }
    return Array.from(map, ([start, b]) => ({ start, ...b })).sort((a, b) => b.start - a.start);
  }, [filtered, period, profitBySale]);

  const active = buckets.find((b) => b.start === picked) ?? buckets[0] ?? null;

  const days = useMemo(() => {
    if (!active) return [];
    const map = new Map<number, Sale[]>();
    for (const s of filtered) {
      if (bucketStart[period](s.timestamp) !== active.start) continue;
      const key = new Date(s.timestamp).setHours(0, 0, 0, 0);
      const bucket = map.get(key);
      if (bucket) bucket.push(s);
      else map.set(key, [s]);
    }
    return Array.from(map.entries());
  }, [filtered, period, active]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" /> Historique des ventes
        </h1>
        <p className="text-sm text-muted-foreground">
          {scope === ALL ? "" : `${scopeLabel(scope)} · `}
          {filtered.length} vente{filtered.length > 1 ? "s" : ""} · Total encaissé{" "}
          <span className="font-semibold text-foreground">{formatFCFA(total)}</span>
        </p>
      </div>

      {scopes.length > 2 && (
        <div className="flex flex-wrap gap-1">
          {scopes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                scope === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent",
              )}
            >
              {scopeLabel(s)}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPeriod(p.key);
                  setPicked(null);
                }}
                aria-pressed={period === p.key}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  period === p.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {buckets.map((b) => (
              <button
                key={b.start}
                type="button"
                onClick={() => setPicked(b.start)}
                aria-pressed={active?.start === b.start}
                className={cn(
                  "rounded-xl border bg-card p-3 text-left transition-all hover:border-primary active:scale-[0.98]",
                  active?.start === b.start && "border-primary ring-2 ring-primary ring-offset-1",
                )}
              >
                <div className="truncate text-sm font-semibold first-letter:uppercase">
                  {bucketLabel(period, b.start)}
                </div>
                <div className="text-lg font-bold tabular-nums text-primary">
                  {formatFCFA(b.total)}
                </div>
                <div className="text-xs font-medium tabular-nums text-emerald-600">
                  {formatFCFA(b.profit)} de bénéfice
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.count} vente{b.count > 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            {scope === ALL
              ? "Aucune vente enregistrée."
              : `Aucune vente pour ${scopeLabel(scope)}.`}
          </CardContent>
        </Card>
      ) : (
        days.map(([day, daySales]) => (
          <section key={day} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 pt-2">
              <h2 className="font-semibold first-letter:uppercase">{formatDay(day)}</h2>
              <span className="text-sm text-muted-foreground">
                {daySales.length} vente{daySales.length > 1 ? "s" : ""} ·{" "}
                <span className="font-semibold text-foreground">
                  {formatFCFA(daySales.reduce((s, x) => s + x.total, 0))}
                </span>
              </span>
            </div>
            {daySales.map((s) => (
              <SaleRow key={s.id} sale={s} profit={profitBySale.get(s.id) ?? 0} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function SaleRow({ sale, profit }: { sale: Sale; profit: number }) {
  const [open, setOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const qc = useQueryClient();

  const items = useQuery({
    queryKey: ["sale_items", sale.id],
    queryFn: () => getSaleItems(sale.id),
    enabled: open,
  });

  const itemCount = useMemo(() => {
    if (items.data) return items.data.reduce((s, i) => s + i.quantity, 0);
    return 0;
  }, [items.data]);

  const cancelMut = useMutation({
    mutationFn: () => cancelSale(sale.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Vente annulée, stock restauré");
      setPinOpen(false);
      setPin("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-3">
        {/* Ligne simplifiée : heure · table · client · nb articles · total */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold tabular-nums">{formatTime(sale.timestamp)}</span>
              {sale.table && (
                <Badge variant="outline" className="text-xs">
                  Table {sale.table}
                </Badge>
              )}
              {sale.client_name && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <User className="h-3 w-3" />
                  {sale.client_name}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {itemCount > 0
                ? `${itemCount} article${itemCount > 1 ? "s" : ""}`
                : items.isLoading
                  ? "…"
                  : ""}
              {isClosed(sale) && <span className="ml-2">· clôturée</span>}
            </div>
          </div>
          <div className="text-lg font-bold text-primary tabular-nums">
            {formatFCFA(sale.total)}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setPinOpen(true)}
            disabled={isClosed(sale)}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {/* Détail déplié : articles, cash, rendu, bénéfice */}
        {open && (
          <div className="mt-3 border-t pt-3 space-y-2 text-sm">
            {items.data?.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span className="text-muted-foreground">
                  {it.quantity} × {it.name}
                </span>
                <span className="font-medium">{formatFCFA(it.price_at_sale * it.quantity)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Donné{" "}
                <span className="font-medium text-foreground">{formatFCFA(sale.cash_given)}</span>
              </span>
              <span>
                Rendu{" "}
                <span className="font-medium text-foreground">{formatFCFA(sale.change_due)}</span>
              </span>
              {profit > 0 && (
                <span>
                  Bénéfice{" "}
                  <span className="font-medium text-emerald-600">{formatFCFA(profit)}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler cette vente ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Entrez le code PIN pour confirmer l'annulation. Le stock sera restauré.
            </p>
            <div>
              <Label htmlFor="pin">Code PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPinOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!verifyPin(pin)) {
                  toast.error("Code PIN incorrect");
                  return;
                }
                cancelMut.mutate();
              }}
            >
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
