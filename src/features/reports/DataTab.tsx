import { formatFCFA } from "@/lib/format";
import { groupByCategory } from "@/lib/reports/group-by-category";
import type { SaleItem } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Kpi } from "@/components/reports";

interface DataTabProps {
  /** Lignes de vente BRUTES de la période. Aucune requête ici : la page les a déjà. */
  items: SaleItem[];
  revenue: number;
  salesCount: number;
}

/**
 * Onglet DONNÉES : ce qui a été vendu, tel qu'écrit.
 *
 * Aucune interprétation : pas de coût, pas de marge, pas de regroupement par type de
 * produit — la séparation produits/services appartient à l'onglet Bénéfice, et la dupliquer
 * ici créerait deux chiffres qui ne se recoupent pas.
 *
 * Le découpage n'est pas calculé ici mais dans `groupByCategory`, aligné sur
 * `computePeriodStats` (clé `product_id ?? name`) : « Top produits », affiché sur la même
 * page, doit compter exactement les mêmes articles.
 */
export function DataTab({ items, revenue, salesCount }: DataTabProps) {
  const groups = groupByCategory(items);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:p-4">
          <Kpi label="Chiffre d'affaires" value={formatFCFA(revenue)} accent />
          <Kpi label="Ventes" value={String(salesCount)} />
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune vente sur la période
        </p>
      ) : (
        groups.map((group) => (
          <Card key={group.category}>
            <CardContent className="space-y-1.5 p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate text-sm font-semibold">{group.category}</h3>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatFCFA(group.total)}
                </span>
              </div>
              {group.lines.map((line) => (
                <div key={line.key} className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                    {line.quantity}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{line.label}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatFCFA(line.total)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
