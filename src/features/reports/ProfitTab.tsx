import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listCharges, type Product, type SaleItem } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { groupChargesByKind } from "@/lib/reports/charges-by-period";
import { soldProductsByCategory } from "@/lib/reports/sold-products-by-category";
import { rangeFor, type CalendarView } from "@/lib/reports/period";
import { ProductCostsSection } from "./ProductCostsSection";
import { ChargeSection, NetLine } from "./ChargeSection";
import { ChargesDialog } from "./ChargesDialog";

/**
 * Onglet BÉNÉFICE : la saisie.
 *
 * Il ne CALCULE aucun bénéfice — la sémantique de `computePeriodStats` est en cours de
 * décision (`ERR-DATA-001` : trois sources de coût coexistent). Afficher ici une marge
 * calculée autrement produirait deux chiffres contradictoires sur le même écran. Les
 * sommes de charges, elles, sont de simples totaux de ce que le vendeur a saisi.
 */
export function ProfitTab({
  products,
  items,
  focusedDay,
  view,
  profit,
}: {
  products: Product[];
  items: SaleItem[];
  focusedDay: number;
  view: CalendarView;
  /**
   * Bénéfice de la période, PRIS TEL QUEL de `computePeriodStats` — jamais recalculé ici.
   * C'est cette valeur que tous les autres écrans (accueil, historique, exports, clôture)
   * affichent ; la recomposer à partir de `products.cost` donnerait un second bénéfice,
   * différent du premier, sur le même écran. Voir `ERR-DATA-001`.
   */
  profit: number;
}) {
  const { from, to } = rangeFor(focusedDay, view);
  const [chargesOpen, setChargesOpen] = useState(false);

  // Même clé que dans `ChargesDialog` : une seule requête, deux observateurs.
  const { data: charges = [] } = useQuery({
    queryKey: ["charges", from, to],
    queryFn: () => listCharges(from, to),
  });
  const { services, business } = groupChargesByKind(charges);

  // Catégories du catalogue portant au moins un produit de type « service » : c'est la
  // seule source disponible pour proposer « Plats » sans que le commerçant l'écrive.
  const serviceCategories = useMemo(
    () => [...new Set(products.filter((p) => p.type === "service").map((p) => p.category))],
    [products],
  );

  // CA par catégorie, classé par la catégorie du CATALOGUE — la même clé que
  // `serviceCategories`. Prendre `category_at_sale` (figée à la vente) ferait manquer le
  // recoupement : une prestation reclassée depuis ses ventes afficherait « 0 vente » sur une
  // catégorie qui a bien rapporté.
  const categoryRevenue = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [category, list] of soldProductsByCategory(products, items)) {
      out[category] = list.reduce((s, p) => s + p.revenue, 0);
    }
    return out;
  }, [products, items]);

  // Une seule soustraction : les charges d'exploitation que le commerçant vient de saisir.
  // Les charges de SERVICE sont DÉJÀ dans `profit` (via `cost_at_sale`) — les retrancher
  // une seconde fois les compterait deux fois.
  const totalBusiness = business.reduce((s, c) => s + c.amount, 0);
  const net = profit - totalBusiness;

  // Le coût d'achat reste facultatif : sans lui, la marge vaut le prix de revente entier.
  // On le dit sous le chiffre plutôt que de le gonfler en silence (cf. ERR-DATA-001).
  const sansCout = soldProductsByCategory(products, items);
  const totalSansCout = [...sansCout.values()].flat().filter((p) => !p.product.cost).length;
  const soldHint =
    totalSansCout > 0
      ? `Bénéfice surestimé : ${totalSansCout} produit${totalSansCout > 1 ? "s" : ""} vendu${totalSansCout > 1 ? "s" : ""} sans coût d'achat saisi.`
      : undefined;

  return (
    <div className="space-y-6">
      {/* Titre choisi pour ce qu'on y FAIT, pas pour ce que c'est : c'est le passage en lot
            pour les produits vendus dont le coût d'achat manque. La saisie individuelle se
            fait au formulaire produit — deux portes pour la même donnée, deux usages. */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Coûts des produits</h2>
        <ProductCostsSection products={products} items={items} />
      </section>

      <ChargeSection
        title="Charges de service"
        total={services.reduce((s, c) => s + c.amount, 0)}
        empty="Aucune charge de service sur la période"
        lines={services.map((c) => ({ id: c.id, label: c.category, amount: c.amount }))}
        onEdit={() => setChargesOpen(true)}
      />

      <ChargeSection
        title="Charges du business"
        total={totalBusiness}
        empty="Aucune charge d'exploitation sur la période"
        lines={business.map((c) => ({ id: c.id, label: c.label, amount: c.amount }))}
        onEdit={() => setChargesOpen(true)}
        // Le total est énoncé dans le bloc final : le répéter ici afficherait deux fois
        // le même nombre à l'écran.
        showTotal={false}
      />

      {/* La conclusion de l'onglet. `profit` vient de `computePeriodStats`, comme tous les
          autres écrans ; on ne le RECALCULE pas, on ne fait qu'y soustraire ce que le
          commerçant vient de saisir et que les ventes ne contiennent pas. */}
      <Card>
        <CardContent className="space-y-1.5 p-3 sm:p-4">
          <h2 className="text-sm font-semibold">Bénéfice net</h2>
          <NetLine label="Marge totale" value={formatFCFA(profit)} />
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

      <ChargesDialog
        open={chargesOpen}
        onOpenChange={setChargesOpen}
        from={from}
        to={to}
        allCategories={serviceCategories}
        categoryRevenue={categoryRevenue}
      />
    </div>
  );
}
