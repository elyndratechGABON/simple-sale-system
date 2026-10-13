import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { toast } from "sonner";
import type { MonthlyOverview, Product, Sale, SaleItem } from "@/lib/db";
import { saveMonthlyOverview } from "@/lib/db";
import { formatFCFA, formatPercent } from "@/lib/format";
import {
  computeMonthlyResult,
  estimateStockValue,
  isConsumableStock,
  monthLabel,
  monthlyCostOfGoods,
} from "@/lib/profit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/** Saisie comptable : jamais de valeur négative. */
function max0(v: number): number {
  return Math.max(0, v);
}

/**
 * « La question de l'argent » : la valeur du stock restant est pré-remplie (auto-estimée
 * = Σ stock×coût, éditable), puis les charges fixes et le complément de coût définitif
 * (si l'une des ventes n'a pas de coût renseigné). Le bouton « Calculer mon bénéfice »
 * enregistre le bilan du mois : c'est lui qui actualise le résumé et la pastille de
 * l'en-tête.
 */
export function MoneyBlock({
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
