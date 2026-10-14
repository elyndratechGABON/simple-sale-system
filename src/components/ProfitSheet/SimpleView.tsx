import { Package, ShoppingBag, TrendingUp, Users } from "lucide-react";
import type { MonthlyOverview, Product, Sale, SaleItem } from "@/lib/db";
import { formatFCFA, formatPercent } from "@/lib/format";
import type { ResultStatus, computeMonthlyResult } from "@/lib/profit";
import type { buildAlerts } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { MoneyBlock } from "./MoneyBlock";
import { STATUS } from "./constants";

/** Vue « Simple » : résumé du mois, la question de l'argent, preuve de calcul, stocks à surveiller. */
export function SimpleView({
  revenue,
  salesCount,
  monthData,
  stockValue,
  status,
  known,
  result,
  month,
  cogs,
  complemented,
  charges,
  stockAlerts,
  overview,
  products,
}: {
  revenue: number;
  salesCount: number;
  monthData: { sales: Sale[]; items: SaleItem[] } | undefined;
  stockValue: number;
  status: ResultStatus;
  known: boolean;
  result: ReturnType<typeof computeMonthlyResult>;
  month: string;
  cogs: { cost: number };
  complemented: number;
  charges: number;
  stockAlerts: ReturnType<typeof buildAlerts>;
  /** `null` = mois sans bilan enregistré, `undefined` = chargement en cours. Même
   *  traitement plus bas (`overview?.x`) : seule la distinction « pas encore » compte. */
  overview: MonthlyOverview | null;
  products: Product[];
}) {
  return (
    <>
      {/* Résumé rapide du mois */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> CA du mois
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-primary">{formatFCFA(revenue)}</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingBag className="h-3 w-3" /> Ventes
            </p>
            <p className="font-semibold tabular-nums">{salesCount}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Panier moyen
            </p>
            <p className="font-semibold tabular-nums">
              {formatFCFA(monthData?.sales.length ? revenue / monthData.sales.length : 0)}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" /> Stock restant
            </p>
            <p className="font-semibold tabular-nums">{formatFCFA(stockValue)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border bg-background/60 p-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
              STATUS[status].cls,
            )}
          >
            {STATUS[status].emoji} {known ? "Bénéfice calculé" : "Bénéfice estimé"}
          </span>
          <span className="text-sm font-bold tabular-nums">
            {formatFCFA(result.profit)}
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              ({formatPercent(result.marginRate)})
            </span>
          </span>
        </div>
        {!known && (
          <p className="mt-2 text-xs text-muted-foreground">
            Évaluation partielle : certaines ventes n'ont pas de coût d'acquisition renseigné.
            Saisissez le complément ci-dessous pour approcher le vrai résultat.
          </p>
        )}
      </div>

      {/* La question de l'argent */}
      <MoneyBlock month={month} monthData={monthData} overview={overview} products={products} />

      {/* Comprendre le résultat */}
      <div className="space-y-1.5 rounded-xl border bg-muted/30 p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Comprendre mon résultat</p>
        <div className="flex justify-between text-muted-foreground">
          <span>CA du mois</span>
          <span className="tabular-nums">{formatFCFA(revenue)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Coût des produits vendus</span>
          <span className="tabular-nums">− {formatFCFA(cogs.cost + complemented)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Charges fixes</span>
          <span className="tabular-nums">− {formatFCFA(charges)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t pt-1.5 font-semibold">
          <span>Bénéfice du mois</span>
          <span className="tabular-nums">{formatFCFA(result.profit)}</span>
        </div>
      </div>

      {/* Stocks à surveiller */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Package className="h-3.5 w-3.5" /> Stocks à surveiller
        </p>
        {stockAlerts.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {stockAlerts.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-medium",
                    a.severity === "danger" && "text-red-600 dark:text-red-400",
                  )}
                >
                  {a.title}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {a.detail}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucune rupture ni stock faible : pensez aux réassorts du mois prochain.
          </p>
        )}
      </div>
    </>
  );
}
