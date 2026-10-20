import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteCharge, listCharges, saveCharge, type Product, type SaleItem } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { groupChargesByKind } from "@/lib/reports/charges-by-period";
import { periodProfit } from "@/lib/reports/period-profit";
import { rangeFor, type CalendarView } from "@/lib/reports/period";
import { NetLine } from "./NetLine";
import { ProductCostsSection } from "./ProductCostsSection";
import { ServiceChargesSection } from "./ServiceChargesSection";
import { BusinessChargesSection } from "./BusinessChargesSection";

/**
 * Onglet BÉNÉFICE : la saisie, et le net recomposé EN DIRECT.
 *
 * Décision ERR-DATA-001, tranchée par écran : les autres écrans (accueil, historique,
 * exports, clôture) continuent d'afficher `computePeriodStats` — le bénéfice figé au
 * coût de la vente (`cost_at_sale`). ICI, le bloc final recompose la marge à partir des
 * coûts ACTUELS du catalogue (`periodProfit`) : corriger un coût d'achat met le bénéfice
 * à jour sans attendre une revente. Deux sémantiques coexistent, chacune proclamée à sa
 * place — plus aucun écran n'affiche les deux chiffres.
 *
 * Les charges se saisissent SUR CET ÉCRAN (plus de dialogue intermédiaire) : la
 * sauvegarde passe au blur, comme pour les coûts produits.
 */
export function ProfitTab({
  products,
  items,
  focusedDay,
  view,
}: {
  products: Product[];
  items: SaleItem[];
  focusedDay: number;
  view: CalendarView;
}) {
  const qc = useQueryClient();
  const { from, to } = rangeFor(focusedDay, view);

  const { data: charges = [] } = useQuery({
    queryKey: ["charges", from, to],
    queryFn: () => listCharges(from, to),
  });
  const { services, business } = groupChargesByKind(charges);

  // Marge au coût courant, CA des prestations et prestations vendues : un
  // seul passage (cf. `periodProfit`), réactif à `["products"]` via sa props.
  const { productMargin, serviceRevenue, servicesSold, categoryRevenue, soldWithoutCost } = useMemo(
    () => periodProfit(products, items),
    [products, items],
  );

  const totalServices = services.reduce((s, c) => s + c.amount, 0);
  const totalBusiness = business.reduce((s, c) => s + c.amount, 0);
  const net = productMargin + serviceRevenue - totalServices - totalBusiness;

  // Le coût d'achat reste facultatif : sans lui, la marge vaut le prix de revente entier.
  // On le dit sous le chiffre plutôt que de le gonfler en silence.
  const soldHint =
    soldWithoutCost > 0
      ? `Bénéfice surestimé : ${soldWithoutCost} produit${soldWithoutCost > 1 ? "s" : ""} vendu${soldWithoutCost > 1 ? "s" : ""} sans coût d'achat saisi.`
      : undefined;

  function save(kind: "service" | "business", key: string, amount: number, id?: string) {
    void saveCharge({
      id,
      kind,
      ...(kind === "service" ? { category: key } : { label: key }),
      period_start: from,
      period_to: to,
      amount,
    })
      .then(() => qc.invalidateQueries({ queryKey: ["charges"] }))
      .catch(() => toast.error("Charge non enregistrée."));
  }

  function remove(id: string) {
    void deleteCharge(id)
      .then(() => qc.invalidateQueries({ queryKey: ["charges"] }))
      .catch(() => toast.error("Charge non supprimée."));
  }

  return (
    <div className="space-y-6">
      {/* Titre choisi pour ce qu'on y FAIT, pas pour ce que c'est : c'est le passage en lot
            pour les produits vendus dont le coût d'achat manque. La saisie individuelle se
            fait au formulaire produit — deux portes pour la même donnée, deux usages. */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Coûts des produits</h2>
        <ProductCostsSection products={products} items={items} />
      </section>

      <ServiceChargesSection
        sold={servicesSold}
        services={services}
        onSave={(name, amount, id) => save("service", name, amount, id)}
        onRemove={(id) => remove(id)}
      />

      <BusinessChargesSection
        business={business}
        onSave={(label, amount, id) => save("business", label, amount, id)}
        onRemove={(id) => remove(id)}
      />

      {/* La conclusion de l'onglet : la marge au coût COURANT, moins ce que le commerçant
          vient de saisir — les ventes ne contiennent ni les charges ni les coûts corrigés. */}
      <Card>
        <CardContent className="space-y-1.5 p-3 sm:p-4">
          <h2 className="text-sm font-semibold">Bénéfice net</h2>
          <NetLine label="Marge produits" value={formatFCFA(productMargin)} />
          <NetLine label="CA des prestations" value={formatFCFA(serviceRevenue)} />
          <NetLine
            label="Charges de service"
            value={totalServices > 0 ? `− ${formatFCFA(totalServices)}` : "—"}
          />
          <NetLine
            label="Charges du business"
            value={totalBusiness > 0 ? `− ${formatFCFA(totalBusiness)}` : "—"}
          />
          <div className="flex items-center justify-between border-t pt-1.5">
            <span className="text-sm font-semibold">Bénéfice net</span>
            <span
              className={cn(
                "text-base font-bold tabular-nums",
                net >= 0 ? "text-primary" : "text-destructive",
              )}
            >
              {formatFCFA(net)}
            </span>
          </div>
          {soldHint && <p className="pt-1 text-xs text-muted-foreground">{soldHint}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
