import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCharges, type Product, type SaleItem } from "@/lib/db";
import { groupChargesByKind } from "@/lib/reports/charges-by-period";
import { rangeFor, type CalendarView } from "@/lib/reports/period";
import { ProductCostsSection } from "./ProductCostsSection";
import { ChargeSection } from "./ChargeSection";
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
}: {
  products: Product[];
  items: SaleItem[];
  focusedDay: number;
  view: CalendarView;
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

  return (
    <div className="space-y-6">
      {/* Titre choisi pour ce qu'on y FAIT, pas pour ce que c'est : c'est le passage en lot
            pour les produits vendus dont le coût d'achat manque. La saisie individuelle se
            fait au formulaire produit — deux portes pour la même donnée, deux usages. */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Compléter les coûts manquants</h2>
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
        total={business.reduce((s, c) => s + c.amount, 0)}
        empty="Aucune charge d'exploitation sur la période"
        lines={business.map((c) => ({ id: c.id, label: c.label, amount: c.amount }))}
        onEdit={() => setChargesOpen(true)}
      />

      <ChargesDialog
        open={chargesOpen}
        onOpenChange={setChargesOpen}
        from={from}
        to={to}
        serviceCategories={serviceCategories}
      />
    </div>
  );
}
