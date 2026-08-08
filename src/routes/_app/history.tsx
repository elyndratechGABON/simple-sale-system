import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { History, ChevronDown, ChevronUp, X } from "lucide-react";
import { cancelSale, getSaleItems, listSales, type Sale } from "@/lib/db";
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

// Sentinelles des onglets. Préfixées `__` pour ne pas pouvoir entrer en collision avec un
// libellé de table réel — rien n'empêche un commerçant de nommer une table « Tous ».
const ALL = "__all";
const COUNTER = "__counter";

const scopeLabel = (scope: string) =>
  scope === ALL ? "Toutes" : scope === COUNTER ? "Comptoir" : `Table ${scope}`;

/**
 * Découpage du calendrier. Une seule granularité à l'écran à la fois : l'écran répond à
 * « combien a fait cette journée / cette semaine / ce mois / cette année », et un montant
 * ne se lit sans ambiguïté que si toutes les cartes couvrent la même durée.
 */
type Period = "day" | "week" | "month" | "year";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

// Semaine au lundi : la semaine commerciale au Gabon comme dans toute l'Europe
// francophone. Le défaut de date-fns est le dimanche, il décalerait chaque carte d'un jour.
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
  // Tout l'historique, pas seulement le jour en cours : les ventes d'hier restent
  // consultables. La clé garde le préfixe ["sales"] déjà invalidé par les mutations.
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", "all"],
    queryFn: () => listSales(),
  });

  // « Tous », « Comptoir » (ventes sans table), ou le libellé d'une table.
  const [scope, setScope] = useState<string>(ALL);

  /**
   * Les onglets se construisent sur les ventes RÉELLEMENT enregistrées, pas sur la liste
   * de tables des Réglages : l'historique raconte ce qui s'est passé. Une table retirée
   * des Réglages garde donc son onglet tant qu'elle a des ventes, et une table jamais
   * servie n'en crée pas un pour rien.
   */
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

  const total = filtered.reduce((s, x) => s + x.total, 0);

  const [period, setPeriod] = useState<Period>("day");
  const [picked, setPicked] = useState<number | null>(null);

  /** Une carte par période AYANT eu des ventes, de la plus récente à la plus ancienne.
   *  Les périodes vides n'ont pas de carte : un calendrier plein de « 0 F » ferait
   *  chercher les journées travaillées au lieu de les montrer. */
  const buckets = useMemo(() => {
    const map = new Map<number, { total: number; count: number }>();
    for (const s of filtered) {
      const key = bucketStart[period](s.timestamp);
      const bucket = map.get(key);
      if (bucket) {
        bucket.total += s.total;
        bucket.count += 1;
      } else {
        map.set(key, { total: s.total, count: 1 });
      }
    }
    return Array.from(map, ([start, b]) => ({ start, ...b })).sort((a, b) => b.start - a.start);
  }, [filtered, period]);

  /** Carte ouverte, DÉRIVÉE de la liste : changer de granularité ou de table fait
   *  retomber la sélection sur la période la plus récente au lieu de pointer une carte
   *  qui n'existe plus. */
  const active = buckets.find((b) => b.start === picked) ?? buckets[0] ?? null;

  // listSales trie déjà du plus récent au plus ancien : l'ordre d'insertion de la Map
  // donne donc les jours dans le bon ordre.
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

      {/* Un onglet par table : c'est l'addition d'une table qu'on vient rechercher, pas
          une liste globale à faire défiler. Masqué tant qu'aucune vente n'a de table —
          une caisse de comptoir n'a rien à filtrer. */}
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

      {/* Le calendrier : une carte par période, avec le montant EXACT encaissé dessus.
          C'est la question qu'on vient poser à l'historique — « combien a fait samedi ? » —
          et elle doit se lire sans dérouler une liste de ventes. */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPeriod(p.key);
                  // La sélection ne survit pas au changement de granularité : un début de
                  // journée n'est pas un début de mois, elle ne désignerait plus rien.
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
              {/* first-letter et non capitalize : en français seul le premier mot prend
                  la majuscule (« mercredi 29 juillet 2026 »). */}
              <h2 className="font-semibold first-letter:uppercase">{formatDay(day)}</h2>
              <span className="text-sm text-muted-foreground">
                {daySales.length} vente{daySales.length > 1 ? "s" : ""} ·{" "}
                <span className="font-semibold text-foreground">
                  {formatFCFA(daySales.reduce((s, x) => s + x.total, 0))}
                </span>
              </span>
            </div>
            {daySales.map((s) => (
              <SaleRow key={s.id} sale={s} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  const [open, setOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const qc = useQueryClient();

  const items = useQuery({
    queryKey: ["sale_items", sale.id],
    queryFn: () => getSaleItems(sale.id),
    enabled: open,
  });

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
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatTime(sale.timestamp)}</span>
              {/* Absent sur une vente au comptoir : il n'y a pas de table à nommer. */}
              {sale.table && <Badge variant="outline">Table {sale.table}</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              Donné {formatFCFA(sale.cash_given)} · Rendu {formatFCFA(sale.change_due)}
            </div>
          </div>
          <div className="text-xl font-bold text-primary">{formatFCFA(sale.total)}</div>
          {sale.day_closed && <Badge variant="secondary">clôturée</Badge>}
          <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPinOpen(true)}
            disabled={sale.day_closed}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        {open && (
          <div className="mt-3 border-t pt-3 space-y-1 text-sm">
            {items.data?.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>
                  {it.quantity} × {it.name}
                </span>
                <span className="font-medium">{formatFCFA(it.price_at_sale * it.quantity)}</span>
              </div>
            ))}
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
