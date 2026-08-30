// « CA & bénéfices » — l'outil du commerçant qui suit sa marge. Ouvert depuis l'en-tête,
// il tient le chiffre d'affaires du jour sous les yeux depuis n'importe quel écran.
//
// Trois blocs :
//  1. Le CA du jour (ventes réglées aujourd'hui) + ventes, panier moyen, bénéfice.
//  2. Le bénéfice par produit, calculé sur les coûts d'acquisition saisis dans les
//     rapports (table `product_expenses`) — exactement les mêmes chiffres que le
//     tableau de bord. Tant qu'aucun coût n'est saisi, la colonne affiche « — » : le
//     but n'est pas de faire croire que le bénéfice égale le CA.
//  3. Le calculateur manuel (ex-« Calculateur de profit » des Paramètres) : prix,
//     coût, quantité — l'estimation qu'on fait AVANT d'encaisser, pour fixer un prix
//     ou écarter un produit.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { getProductExpenses, getSaleItemsForSales, listSalesToday } from "@/lib/db";
import { computePeriodStats, lastDaysRange } from "@/lib/analytics";
import { formatFCFA } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TOP_PRODUCTS = 8;

export function ProfitSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const todayRange = useMemo(() => lastDaysRange(1), []);

  const { data: todayData } = useQuery({
    queryKey: ["sales", "range", todayRange.from, todayRange.to],
    queryFn: async () => {
      const sales = await listSalesToday();
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
  });

  const { data: productExpenses = [] } = useQuery({
    queryKey: ["product_expenses", todayRange.from, todayRange.to],
    queryFn: () => getProductExpenses(todayRange.from, todayRange.to),
    enabled: Boolean(todayData && todayData.sales.length > 0),
  });

  const stats = useMemo(() => {
    if (!todayData) return null;
    return computePeriodStats(
      todayData.sales,
      todayData.items,
      todayRange.from,
      todayRange.to,
      productExpenses,
    );
  }, [todayData, todayRange, productExpenses]);

  // Seuls les produits pour lesquels un coût d'acquisition est saisi portent un bénéfice
  // fiable : les autres affichent « — » plutôt qu'un CA déguisé en marge.
  const expenseByProduct = useMemo(
    () => new Map(productExpenses.map((e) => [e.product_id, e.cost])),
    [productExpenses],
  );
  const hasCosts = expenseByProduct.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> CA & bénéfices
          </DialogTitle>
          <DialogDescription>
            Le chiffre d'affaires réglé aujourd'hui, et la marge par produit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> CA total en cours ·{" "}
              {new Date().toLocaleDateString("fr-FR")}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
              {formatFCFA(stats?.revenue ?? 0)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShoppingBag className="h-3 w-3" /> Ventes
                </p>
                <p className="font-semibold tabular-nums">{stats?.salesCount ?? 0}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> Panier moyen
                </p>
                <p className="font-semibold tabular-nums">
                  {formatFCFA(stats?.averageBasket ?? 0)}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calculator className="h-3 w-3" /> Bénéfice
                </p>
                <p className="font-semibold tabular-nums">
                  {hasCosts ? formatFCFA(stats?.profit ?? 0) : "—"}
                </p>
              </div>
            </div>
            {!hasCosts && stats && stats.salesCount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Saisissez les coûts d'acquisition dans les rapports pour voir la marge réelle.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4" /> Bénéfice par produit
            </p>
            {stats && stats.topProducts.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border">
                {stats.topProducts.slice(0, TOP_PRODUCTS).map((p) => {
                  const known = expenseByProduct.has(p.product_id);
                  return (
                    <div key={p.product_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {p.quantity} × {formatFCFA(p.revenue / p.quantity)}
                      </span>
                      <span
                        className={cn(
                          "w-24 shrink-0 text-right tabular-nums",
                          known ? "font-semibold" : "text-muted-foreground/60",
                        )}
                      >
                        {known ? formatFCFA(p.profit) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Aucune vente encaissée aujourd'hui.
              </p>
            )}
          </div>

          <ManualCalculator />
        </div>
      </DialogContent>
    </Dialog>
  );
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
