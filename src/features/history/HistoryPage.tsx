import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Download } from "lucide-react";
import { getSaleItemsForSales, listSales, type Sale, type SaleItem } from "@/lib/db";
import { lineProfit } from "@/lib/analytics";
import { formatDay, formatFCFA } from "@/lib/format";
import { buildSalesCsvBlob, salesCsvFilename } from "@/lib/exports/sales-csv";
import { describeSaveResult, saveDocument } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ALL, COUNTER, bucketStart, scopeLabel, type Period } from "./history-period";
import { HistoryFilters } from "./HistoryFilters";
import { SaleRow } from "./SaleRow";

export function HistoryPage() {
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

  const itemsBySale = useMemo(() => {
    const map = new Map<string, SaleItem[]>();
    for (const item of periodItems ?? []) {
      const list = map.get(item.sale_id);
      if (list) list.push(item);
      else map.set(item.sale_id, [item]);
    }
    return map;
  }, [periodItems]);

  const total = filtered.reduce((s, x) => s + x.total, 0);

  const [period, setPeriod] = useState<Period>("day");
  const [picked, setPicked] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportSales() {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      const filename = salesCsvFilename(
        scope === ALL ? "toutes" : scope === COUNTER ? "comptoir" : `table-${scope}`,
      );
      const result = await saveDocument(buildSalesCsvBlob(filtered, itemsBySale), filename);
      toast.success(describeSaveResult(result, filename));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setExporting(false);
    }
  }
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
    <div className="mx-auto max-w-4xl px-[var(--page-gutter)] py-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold">
            <History className="h-6 w-6 shrink-0" /> Historique des ventes
          </h1>
          <p className="text-sm text-muted-foreground">
            {scope === ALL ? "" : `${scopeLabel(scope)} · `}
            {filtered.length} vente{filtered.length > 1 ? "s" : ""} · Total encaissé{" "}
            <span className="font-semibold text-foreground">{formatFCFA(total)}</span>
          </p>
        </div>
        {/* Export CSV de la liste telle qu'elle est filtrée : un tableau se lit
            plus commodément dans un tableur que dans l'écran d'un téléphone. */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={filtered.length === 0 || exporting}
          onClick={() => void exportSales()}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {exporting ? "Export…" : "CSV"}
        </Button>
      </div>

      <HistoryFilters
        scopes={scopes}
        scope={scope}
        onScope={setScope}
        hasSales={filtered.length > 0}
        period={period}
        onPeriod={(p) => {
          setPeriod(p);
          setPicked(null);
        }}
        buckets={buckets}
        active={active}
        onPick={setPicked}
      />

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
              <SaleRow
                key={s.id}
                sale={s}
                profit={profitBySale.get(s.id) ?? 0}
                items={itemsBySale.get(s.id) ?? []}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
