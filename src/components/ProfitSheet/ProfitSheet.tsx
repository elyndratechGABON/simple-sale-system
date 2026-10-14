// « CA & bénéfices » — l'outil du commerçant qui suit sa marge. Ouvert depuis l'en-tête,
// passé du jour au MOIS (accord utilisateur).
//
// Formule figée :
//   Bénéfice du mois = CA du mois − COGS − complément de coût − charges fixes
//   COGS        = Σ `cost_at_sale` figés dans les lignes de vente du mois.
//   Charges     = montant global saisi (loyer, eau, électricité…).
//   Stock restant = REPÈRE affiché (auto-estimé = Σ stock×coût, éditable), jamais soustrait.
//
// Deux vues segmentées :
//  « Simple »  — CA + bénéfice calculé/estimé du mois, la « question de l'argent »
//                (stock, charges fixes, complément), la preuve de calcul, les stocks à surveiller.
//  « Détaillé » — le bénéfice par produit (coûts des rapports) + le calculateur d'avant encaissement.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import {
  getMonthlyOverview,
  getProductExpenses,
  getSaleItemsForSales,
  listOpenTables,
  listProducts,
  listSales,
} from "@/lib/db";
import { computePeriodStats } from "@/lib/analytics";
import { buildAlerts } from "@/lib/alerts";
import {
  computeMonthlyResult,
  currentMonthKey,
  estimateStockValue,
  monthRange,
  monthlyCostOfGoods,
  nextMonthKey,
  previousMonthKey,
  resultStatus,
} from "@/lib/profit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleView } from "./SimpleView";
import { DetailView } from "./DetailView";
import { SheetControls } from "./SheetControls";

export function ProfitSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [mode, setMode] = useState<"simple" | "detail">("simple");
  const range = useMemo(() => monthRange(month), [month]);
  const atCurrentMonth = month === currentMonthKey();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const { data: monthData } = useQuery({
    queryKey: ["sales", "month", month],
    queryFn: async () => {
      const sales = await listSales(range.from, range.to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
  });

  // Un mois sans bilan enregistré est l'absence NORMALE : `await` avant le `??`, sinon
  // la requête résout vers `undefined` et React Query la fait échouer (ERR-QUERY-001).
  const { data: overview } = useQuery({
    queryKey: ["monthly_overview", month],
    queryFn: async () => (await getMonthlyOverview(month)) ?? null,
  });

  const { data: productExpenses = [] } = useQuery({
    queryKey: ["product_expenses", range.from, range.to],
    queryFn: () => getProductExpenses(range.from, range.to),
    enabled: Boolean(monthData && monthData.sales.length > 0),
  });

  const { data: openTables = [] } = useQuery({
    queryKey: ["open_tables"],
    queryFn: listOpenTables,
  });

  const cogs = useMemo(() => monthlyCostOfGoods(monthData?.items ?? []), [monthData]);

  const stockEstimate = useMemo(() => estimateStockValue(products), [products]);

  // La preuve s'affiche dans la vue « Simple » ; la vue « Détaillé » garde les profits
  // par produit des rapports (même agrégation que le tableau de bord).
  const stats = useMemo(() => {
    if (!monthData || mode !== "detail") return null;
    return computePeriodStats(
      monthData.sales,
      monthData.items,
      range.from,
      range.to,
      productExpenses,
    );
  }, [monthData, mode, range, productExpenses]);

  // Seuls les produits pour lesquels un coût d'acquisition est saisi portent un profit
  // fiable dans le détail : les autres affichent « — » plutôt qu'un CA déguisé en marge.
  const expenseByProduct = useMemo(
    () => new Map(productExpenses.map((e) => [e.product_id, e.cost])),
    [productExpenses],
  );

  const known = cogs.coverage >= 1 - 1e-9 && cogs.unknownLines === 0;
  const salesCount = monthData?.sales.length ?? 0;
  const revenue = cogs.revenue;

  const complemented = known ? (overview?.cost_complement ?? 0) : 0;
  const charges = overview?.charges ?? 0;
  const stockValue = overview?.stock_override ?? stockEstimate.value;

  const result = useMemo(
    () => computeMonthlyResult({ revenue, cogs: cogs.cost, costComplement: complemented, charges }),
    [revenue, cogs.cost, complemented, charges],
  );
  const status = resultStatus(result.profit, revenue);
  const stockAlerts = useMemo(
    () =>
      buildAlerts(products, openTables).filter(
        (a) => a.severity === "danger" || a.severity === "warning",
      ),
    [products, openTables],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> CA & bénéfices
          </DialogTitle>
          <DialogDescription>
            Le bilan mensuel de votre commerce : ce qui entre, ce que ça coûte, ce qui reste.
          </DialogDescription>
        </DialogHeader>

        <SheetControls
          month={month}
          atCurrentMonth={atCurrentMonth}
          onPrev={() => setMonth(previousMonthKey(month))}
          onNext={() => setMonth(nextMonthKey(month))}
          mode={mode}
          onModeChange={setMode}
        />

        <div className="space-y-4">
          {mode === "simple" ? (
            <SimpleView
              revenue={revenue}
              salesCount={salesCount}
              monthData={monthData}
              stockValue={stockValue}
              status={status}
              known={known}
              result={result}
              month={month}
              cogs={cogs}
              complemented={complemented}
              charges={charges}
              stockAlerts={stockAlerts}
              overview={overview}
              products={products}
            />
          ) : (
            <DetailView stats={stats} expenseByProduct={expenseByProduct} month={month} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
