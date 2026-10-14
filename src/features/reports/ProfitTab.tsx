import type { Product, SaleItem } from "@/lib/db";
import { ProductCostsSection } from "./ProductCostsSection";

/**
 * Onglet BÉNÉFICE, première tranche : la saisie des coûts produits.
 *
 * Il ne CALCULE aucun bénéfice. Le chiffre affiché par la page vient de
 * `computePeriodStats`, dont la sémantique est en cours de décision (cf. `ERR-DATA-001` :
 * trois sources de coût coexistent). Afficher ici une marge calculée autrement
 * produirait deux chiffres contradictoires sur le même écran — exactement ce qu'on a
 * passé la soirée à supprimer. La saisie, elle, est utile immédiatement.
 *
 * Les sections Charges de service et Charges business arrivent en Phase 4.
 */
export function ProfitTab({ products, items }: { products: Product[]; items: SaleItem[] }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Coûts des produits</h2>
        <ProductCostsSection products={products} items={items} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Charges de service</h2>
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Bientôt disponible
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Charges du business</h2>
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Bientôt disponible
        </p>
      </section>
    </div>
  );
}
