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
  revenue,
  salesCount,
  averageBasket,
}: {
  products: Product[];
  items: SaleItem[];
  focusedDay: number;
  view: CalendarView;
  /** CA + ventes + panier : les stats de période calculées par la page (Comptabilité). */
  revenue: number;
  salesCount: number;
  averageBasket: number;
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Titre choisi pour ce qu'on y FAIT, pas pour ce que c'est : c'est le passage en lot
            pour les produits vendus dont le coût d'achat manque. La saisie individuelle se
            fait au formulaire produit — deux portes pour la même donnée, deux usages. */}
      <section>
        <h2 className="mb-2 text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded inline-block">
          Produits
        </h2>
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

      {/* La conclusion de l'onglet, en CARTE IMPACTANTE (mission carte bénéfice) :
          deux chiffres énormes (CA et bénéfice net), le détail recomposé en dessous en
          plus petit. Fond blanc en clair (bg-card) + bordure subtile + ombre — elle
          DOIT ressortir du flux. */}
      <Card className="bg-card shadow-md rounded-2xl border-border/50">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded inline-block">
            Bénéfice net
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-small text-muted-foreground">Chiffre d&apos;affaires</p>
              <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {formatFCFA(revenue)}
              </p>
            </div>
            <div>
              <p className="text-small text-muted-foreground">Bénéfice net</p>
              <p
                className={cn(
                  "text-4xl font-bold tracking-tight tabular-nums",
                  net >= 0 ? "text-primary" : "text-destructive",
                )}
              >
                {formatFCFA(net)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground border-t pt-3">
            <span>
              Ventes&nbsp;
              <span className="font-semibold text-foreground tabular-nums">{salesCount}</span>
            </span>
            <span>
              Panier moyen&nbsp;
              <span className="font-semibold text-foreground tabular-nums">
                {salesCount > 0 ? formatFCFA(averageBasket) : "—"}
              </span>
            </span>
            <span>
              Marge produits&nbsp;
              <span className="font-medium text-foreground tabular-nums">
                {formatFCFA(productMargin)}
              </span>
            </span>
            <span>
              CA service&nbsp;
              <span className="font-medium text-foreground tabular-nums">
                {formatFCFA(serviceRevenue)}
              </span>
            </span>
          </div>
          {soldHint && <p className="text-xs text-muted-foreground">{soldHint}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
