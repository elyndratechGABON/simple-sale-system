// Photo complète d'un jour : interroge IndexedDB pour CE jour précis puis rend CA,
// paiements, clients, produits vendus. Utilisé par la vue « Jour » ET par le
// dialogue de détail — une seule implémentation, deux points d'entrée.

import { useMemo } from "react";
import { startOfDay } from "date-fns";
import type { PaymentMethod } from "@/lib/db";
import { computeDayDetail } from "@/lib/analytics";
import { usePeriodData } from "@/hooks/use-period-data";
import { formatFCFA, formatKg } from "@/lib/format";
import { DayStat } from "./primitives";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "Carte",
  mobile_money: "Mobile Money",
};

export function DayDetailContent({
  day,
  isService,
  hasWeightInput,
}: {
  day: number;
  isService: boolean;
  hasWeightInput: boolean;
}) {
  const from = startOfDay(day).getTime();
  const to = from + 86400000;
  const { data, isPending } = usePeriodData(from, to);
  const detail = useMemo(() => {
    const sales = data?.sales ?? [];
    const items = data?.items ?? [];
    return computeDayDetail(sales, items);
  }, [data]);

  if (isPending) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DayStat label="CA" value={formatFCFA(detail.revenue)} />
        <DayStat label="Bénéfice" value={formatFCFA(detail.profit)} />
        <DayStat label="Ventes" value={String(detail.salesCount)} />
        <DayStat label="Clients" value={String(detail.customers)} />
      </div>

      {detail.byPayment.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Paiements</p>
          <div className="flex flex-wrap gap-1.5">
            {detail.byPayment.map((p) => (
              <span
                key={p.method}
                className="rounded-full bg-muted px-2 py-1 text-xs font-medium tabular-nums"
              >
                {PAYMENT_LABELS[p.method]} · {formatFCFA(p.total)}
              </span>
            ))}
          </div>
        </div>
      )}

      {(detail.clients.length > 0 || detail.tables.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {detail.tables.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-1 text-xs">
              Table {t}
            </span>
          ))}
          {detail.clients.map((c) => (
            <span key={c} className="rounded-full bg-muted px-2 py-1 text-xs">
              {c}
            </span>
          ))}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Produits vendus · {detail.itemsCount}
        </p>
        {detail.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente ce jour-là.</p>
        ) : (
          <>
            <div className="space-y-1">
              {detail.products.map((p) => (
                <div key={p.product_id} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">
                    {p.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {hasWeightInput ? formatKg(p.quantity) : `×${p.quantity}`}
                      {isService ? " prestation" : " vente"}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{formatFCFA(p.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-sm font-medium">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular-nums">{formatFCFA(detail.revenue)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
