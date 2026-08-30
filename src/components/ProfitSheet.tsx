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
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Coins,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { MonthlyOverview, Product, Sale, SaleItem } from "@/lib/db";
import {
  getMonthlyOverview,
  getProductExpenses,
  getSaleItemsForSales,
  listOpenTables,
  listProducts,
  listSales,
  saveMonthlyOverview,
} from "@/lib/db";
import { computePeriodStats } from "@/lib/analytics";
import { buildAlerts } from "@/lib/alerts";
import { formatFCFA, formatPercent } from "@/lib/format";
import {
  computeMonthlyResult,
  currentMonthKey,
  estimateStockValue,
  isConsumableStock,
  monthLabel,
  monthRange,
  monthlyCostOfGoods,
  nextMonthKey,
  previousMonthKey,
  resultStatus,
  type ResultStatus,
} from "@/lib/profit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const TOP_PRODUCTS = 8;

const STATUS = {
  ok: {
    emoji: "🟢",
    label: "Bénéfice",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  warn: {
    emoji: "🟠",
    label: "Perte légère",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  bad: {
    emoji: "🔴",
    label: "Alarme",
    cls: "border-destructive/30 bg-destructive/10 text-red-700 dark:text-red-400",
  },
} as const;

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

  const { data: overview } = useQuery({
    queryKey: ["monthly_overview", month],
    queryFn: () => getMonthlyOverview(month),
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

        {/* Sélecteur de mois + bascule Simple / Détaillé */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Mois précédent"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:bg-accent"
            onClick={() => setMonth(previousMonthKey(month))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold capitalize">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            aria-label="Mois suivant"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40"
            disabled={atCurrentMonth}
            onClick={() => setMonth(nextMonthKey(month))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("simple")}
            className={cn(
              "h-8 rounded-md text-sm font-medium transition-colors",
              mode === "simple"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setMode("detail")}
            className={cn(
              "h-8 rounded-md text-sm font-medium transition-colors",
              mode === "detail"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Détaillé
          </button>
        </div>

        <div className="space-y-4">
          {mode === "simple" ? (
            <>
              {/* Résumé rapide du mois */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> CA du mois
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
                  {formatFCFA(revenue)}
                </p>

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
                    Évaluation partielle : certaines ventes n'ont pas de coût d'acquisition
                    renseigné. Saisissez le complément ci-dessous pour approcher le vrai résultat.
                  </p>
                )}
              </div>

              {/* La question de l'argent */}
              <MoneyBlock
                month={month}
                monthData={monthData}
                overview={overview}
                products={products}
              />

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
          ) : (
            <>
              {/* Bénéfice par produit — coûts d'acquisition saisis dans les rapports */}
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Coins className="h-4 w-4" /> Bénéfice par produit
                </p>
                {stats && stats.topProducts.length > 0 ? (
                  <div className="divide-y divide-border rounded-xl border">
                    {stats.topProducts.slice(0, TOP_PRODUCTS).map((p) => {
                      const knownProd = expenseByProduct.has(p.product_id);
                      return (
                        <div
                          key={p.product_id}
                          className="flex items-center gap-2 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {p.quantity} × {formatFCFA(p.revenue / p.quantity)}
                          </span>
                          <span
                            className={cn(
                              "w-24 shrink-0 text-right tabular-nums",
                              knownProd ? "font-semibold" : "text-muted-foreground/60",
                            )}
                          >
                            {knownProd ? formatFCFA(p.profit) : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucune vente encaissée sur {monthLabel(month)}.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Coûts saisis dans les Rapports › Coûts d'acquisition. Sans coût, « — ».
                </p>
              </div>

              <ManualCalculator />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * « La question de l'argent » : la valeur du stock restant est pré-remplie (auto-estimée
 * = Σ stock×coût, éditable), puis les charges fixes et le complément de coût définitif
 * (si l'une des ventes n'a pas de coût renseigné). Le bouton « Calculer mon bénéfice »
 * enregistre le bilan du mois : c'est lui qui actualise le résumé et la pastille de
 * l'en-tête.
 */
function MoneyBlock({
  month,
  monthData,
  overview,
  products,
}: {
  month: string;
  monthData: { sales: Sale[]; items: SaleItem[] } | undefined;
  overview: MonthlyOverview | undefined;
  products: Product[];
}) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState({ stock: "", charges: "", complement: "" });

  const cogs = monthlyCostOfGoods(monthData?.items ?? []);
  const autoStock = estimateStockValue(products);
  const partial = cogs.coverage < 1 - 1e-9;

  // Un montant à 0 s'affiche vide : le champ « charges » d'un mois sans frais ne doit pas
  // faire croire qu'une somme a été saisie.
  const fmt = (v: number) => (v > 0 ? String(Math.round(v)) : "");

  // Seed calculé à chaque source : le mois, le bilan enregistré, l'estimation du stock.
  const seed = {
    stock: overview?.stock_override ?? autoStock.value,
    charges: overview?.charges ?? 0,
    complement: overview?.cost_complement ?? 0,
  };

  // Les champs reprennent le seed à chaque changement de mois ou de bilan enregistré.
  // Un redémarrage du composant (fermeture/réouverture) recharge donc l'existant.
  useEffect(() => {
    setDrafts({
      stock: fmt(seed.stock),
      charges: fmt(seed.charges),
      complement: fmt(seed.complement),
    });
  }, [month, seed.stock, seed.charges, seed.complement]);

  const stockN = max0(Number(drafts.stock.replace(/\D/g, "")) || 0);
  const chargesN = max0(Number(drafts.charges.replace(/\D/g, "")) || 0);
  const complementN = max0(Number(drafts.complement.replace(/\D/g, "")) || 0);

  const dirty =
    drafts.stock !== fmt(seed.stock) ||
    drafts.charges !== fmt(seed.charges) ||
    drafts.complement !== fmt(seed.complement);

  const preview = computeMonthlyResult({
    revenue: cogs.revenue,
    cogs: cogs.cost,
    costComplement: complementN,
    charges: chargesN,
  });

  const consumable = products
    .filter(isConsumableStock)
    .map((p) => ({ p, value: p.stock * p.cost }));

  async function save() {
    await saveMonthlyOverview(month, {
      charges: chargesN,
      stock_override: stockN === autoStock.value ? null : stockN,
      cost_complement: partial ? complementN : null,
    });
    qc.invalidateQueries({ queryKey: ["monthly_overview"] });
    qc.invalidateQueries({ queryKey: ["sales", "month", month] });
    toast.success(`Bilan enregistré pour ${monthLabel(month)}`);
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" /> La question de l'argent
      </p>

      <div className="flex flex-col gap-1">
        <Label htmlFor="profit-stock" className="text-xs text-muted-foreground">
          Valeur du stock restant (reste à vendre)
        </Label>
        <Input
          id="profit-stock"
          inputMode="numeric"
          value={drafts.stock}
          onChange={(e) => setDrafts((d) => ({ ...d, stock: e.target.value.replace(/\D/g, "") }))}
          className="h-10 text-right tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          Estimation automatique : {formatFCFA(autoStock.value)}
          {autoStock.known < autoStock.total
            ? ` (partielle, ${autoStock.known}/${autoStock.total} produits à coût connu)`
            : " — corriger si besoin."}
        </p>
      </div>

      <div className="space-y-1">
        <Collapsible>
          <CollapsibleTrigger className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Voir le détail produit par produit
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 divide-y divide-border rounded-lg border bg-background/60">
              {consumable.map(({ p, value }) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {Number.isFinite(p.stock) ? p.stock : "∞"} × {formatFCFA(p.cost)}
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">{formatFCFA(value)}</span>
                </div>
              ))}
              {consumable.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Aucun produit au stock : la valeur est nulle.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="profit-charges" className="text-xs text-muted-foreground">
          Charges fixes du mois (loyer, eau, électricité…)
        </Label>
        <Input
          id="profit-charges"
          inputMode="numeric"
          value={drafts.charges}
          onChange={(e) => setDrafts((d) => ({ ...d, charges: e.target.value.replace(/\D/g, "") }))}
          className="h-10 text-right tabular-nums"
        />
      </div>

      {partial && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="profit-complement" className="text-xs text-muted-foreground">
            Complément de coût (achats dont le coût n'est pas suivi)
          </Label>
          <Input
            id="profit-complement"
            inputMode="numeric"
            value={drafts.complement}
            onChange={(e) =>
              setDrafts((d) => ({ ...d, complement: e.target.value.replace(/\D/g, "") }))
            }
            className="h-10 text-right tabular-nums"
          />
        </div>
      )}

      {dirty && (
        <p className="text-xs text-muted-foreground">
          Résultat en direct : {formatFCFA(preview.profit)} ({formatPercent(preview.marginRate)},
          {preview.profit >= 0 ? " à l'avantage" : " à surveiller"}). Enregistrez pour le figer.
        </p>
      )}

      <Button className="w-full gap-2" onClick={save} disabled={!dirty}>
        <Calculator className="h-4 w-4" /> Calculer mon bénéfice
      </Button>
    </div>
  );
}

/** Saisie comptable : jamais de valeur négative. */
function max0(v: number): number {
  return Math.max(0, v);
}

/** Calculateur manuel : prix de vente, coût d'acquisition, quantité — le bénéfice et la
 *  marge se calculent au fil de la frappe. Ex-« Calculateur de profit » des Paramètres. */
function ManualCalculator() {
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("1");

  const priceN = Number(price.replace(/\D/g, "")) || 0;
  const costN = Number(cost.replace(/\D/g, "")) || 0;
  const qtyN = Math.max(1, Number(qty.replace(/\D/g, "")) || 1);
  const unitProfit = priceN - costN;
  const profit = unitProfit * qtyN;
  const revenue = priceN * qtyN;
  const margin = revenue > 0 ? profit / revenue : 0;
  const filled = priceN > 0 || costN > 0;
  const positive = unitProfit >= 0;

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-sm font-medium">Estimer avant d'encaisser</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="prop-pack-price" className="text-xs text-muted-foreground">
            Prix de vente
          </Label>
          <Input
            id="prop-pack-price"
            inputMode="numeric"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            className="h-10 text-right tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="prop-pack-cost" className="text-xs text-muted-foreground">
            Coût
          </Label>
          <Input
            id="prop-pack-cost"
            inputMode="numeric"
            placeholder="0"
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
            className="h-10 text-right tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="prop-pack-qty" className="text-xs text-muted-foreground">
            Qté
          </Label>
          <Input
            id="prop-pack-qty"
            inputMode="numeric"
            placeholder="1"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
            className="h-10 text-right tabular-nums"
          />
        </div>
      </div>

      {filled ? (
        <div className="mt-3 space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Bénéfice ({qtyN} vente{qtyN > 1 ? "s" : ""})
            </span>
            <span
              className={cn(
                "font-bold tabular-nums",
                positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {formatFCFA(profit)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Marge</span>
            <span className="font-medium tabular-nums">
              {revenue > 0 ? `${Math.round(margin * 100)} %` : "—"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all duration-300",
                positive ? "bg-primary" : "bg-destructive",
              )}
              style={{ width: `${Math.max(0, Math.min(100, margin * 100))}%` }}
            />
          </div>
          {priceN > 0 && costN > 0 && !positive && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Ce prix ne couvre pas le coût d'acquisition.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Le résultat apparaît ici dès qu'un prix ou un coût est saisi.
        </p>
      )}
    </div>
  );
}
