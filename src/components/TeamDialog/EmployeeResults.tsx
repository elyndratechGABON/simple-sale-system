import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Package, Phone, Receipt } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { getSaleItemsForSales, listSales } from "@/lib/db";
import type { PairedDevice } from "@/lib/syncengine/types";
import { RoleBadge } from "./RoleBadge";
import { isOwnSale } from "./helpers";
import { monthGrid } from "./calendar-days";

/** Compactage d'un montant pour tenir dans une cellule de calendrier (12 500 → 12,5 k). */
const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Fiche d'un écran : calendrier du mois (CA jour par jour), ventes du jour au clic.
 *
 * Un seul appel à la base — les ventes du MOIS affiché — d'où le calendrier, le
 * récapitulatif du mois et le détail d'une journée sont dérivés du même lot. */
export function EmployeeResults({ device }: { device: PairedDevice }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [daySel, setDaySel] = useState<number | null>(null);

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  // Étendue du mois affiché — `to` exclusif, le premier jour du mois suivant.
  const frame = useMemo(() => {
    const from = new Date(cursor.year, cursor.month, 1).getTime();
    const to = new Date(
      cursor.month === 11 ? cursor.year + 1 : cursor.year,
      (cursor.month + 1) % 12,
      1,
    ).getTime();
    return [from, to] as const;
  }, [cursor]);

  const { data: monthSales } = useQuery({
    queryKey: ["team_month", device.id, frame[0]],
    queryFn: () => listSales(frame[0], frame[1]),
    staleTime: 10_000,
  });

  const own = useMemo(
    () => (monthSales ?? []).filter((s) => isOwnSale(s, device)),
    [monthSales, device],
  );

  // CA jour par jour : la clé est le début du jour local de la vente.
  const perDay = useMemo(() => {
    const map = new Map<number, { count: number; revenue: number }>();
    for (const s of own) {
      const d = new Date(s.timestamp);
      const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const cur = map.get(k) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += s.total;
      map.set(k, cur);
    }
    return map;
  }, [own]);

  // Ventes du jour choisi : dérivées du même lot, aucun nouvel appel à la base.
  const daySales = useMemo(
    () =>
      daySel === null
        ? []
        : own.filter((s) => s.timestamp >= daySel && s.timestamp < daySel + 86400_000),
    [own, daySel],
  );
  const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);

  // Produits vendus le jour choisi : lignes de `sale_items` agrégées par produit
  // (quel produit, combien d'unités) — pas seulement le CA par vente.
  const { data: dayItems } = useQuery({
    queryKey: ["team_day_items", daySales.map((s) => s.id)],
    queryFn: () => getSaleItemsForSales(daySales.map((s) => s.id)),
    enabled: daySel !== null && daySales.length > 0,
    staleTime: 30_000,
  });

  const dayProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of dayItems ?? []) {
      const key = it.product_id ?? it.name;
      const cur = map.get(key) ?? {
        name: it.variant ? `${it.name} (${it.variant})` : it.name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += it.quantity;
      cur.revenue += it.quantity * it.price_at_sale;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [dayItems]);

  // Un jour futur de ce mois ne se commande pas (aucun clic, en semonce grise).
  const todayEnd = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate() + 1,
  ).getTime();

  function nav(delta: -1 | 1) {
    setDaySel(null);
    setCursor((c) => {
      const m = c.month + delta;
      return { year: m < 0 ? c.year - 1 : m > 11 ? c.year + 1 : c.year, month: (m + 12) % 12 };
    });
  }

  const monthTitle = new Date(cursor.year, cursor.month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const monthRevenue = own.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-3">
      {/* Identité de la personne : nom + numéro joignable, tels que l'écran les déclare */}
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {device.device_name?.trim() || "Écran sans nom"}
          </p>
          {device.phone?.trim() ? (
            <a
              href={`tel:${device.phone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
            >
              <Phone className="h-3 w-3" />
              {device.phone.trim()}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">Numéro non déclaré par cet écran.</p>
          )}
        </div>
        <RoleBadge role={device.role} />
      </div>

      {/* Calendrier du mois : une cellule par jour, le CA réglé sous le numéro du jour */}
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Mois précédent"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            onClick={() => nav(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold capitalize">{monthTitle}</p>
          <button
            type="button"
            aria-label="Mois suivant"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            onClick={() => nav(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px pt-1">
          {grid.map((cell) => {
            if (!cell.inMonth) return <span key={cell.ts} />;
            const stats = perDay.get(cell.ts);
            const future = cell.ts >= todayEnd;
            return (
              <button
                key={cell.ts}
                type="button"
                disabled={future}
                onClick={() => setDaySel(cell.ts)}
                title={stats ? formatFCFA(stats.revenue) : undefined}
                className={[
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors",
                  future ? "text-muted-foreground/40" : "hover:bg-accent",
                  stats ? "bg-primary/5" : "",
                  cell.ts === daySel ? "ring-2 ring-primary" : "",
                ].join(" ")}
              >
                <span className={stats ? "font-semibold" : undefined}>
                  {new Date(cell.ts).getDate()}
                </span>
                {stats && (
                  <span className="text-[10px] font-medium tabular-nums text-primary">
                    {compact.format(stats.revenue)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Récapitulatif du mois affiché */}
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Mois affiché</p>
        <p className="text-sm font-semibold tabular-nums">
          {formatFCFA(monthRevenue)} · {own.length} vente{own.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Détail du jour choisi : dérivé du lot du mois, aucun nouvel appel à la base */}
      {daySel !== null && (
        <div className="space-y-1.5 rounded-xl border bg-card p-3">
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {new Date(daySel).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            — {formatFCFA(dayTotal)} · {daySales.length} vente{daySales.length > 1 ? "s" : ""}
          </p>
          {daySales.length > 0 ? (
            <>
              {dayProducts.length > 0 && (
                <div className="mb-2 space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Package className="h-3.5 w-3.5" /> Produits vendus
                  </p>
                  {dayProducts.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {p.name}
                        <span className="ml-1 text-xs text-muted-foreground">× {p.qty}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatFCFA(p.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {daySales.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Receipt className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.timestamp).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {s.client_name ? ` · ${s.client_name}` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{formatFCFA(s.total)}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune vente ce jour-là.</p>
          )}
        </div>
      )}
    </div>
  );
}
