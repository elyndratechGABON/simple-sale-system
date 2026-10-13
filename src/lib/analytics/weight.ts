import type { Product, SaleItem } from "@/lib/db";
import type { WeightSalesBucket, WeightSalesStats } from "./types";

// ── Ventes au poids ──────────────────────────────────────────────────────────────
//
// Pour la boucherie, la ligne de vente porte le POIDS vendu dans `quantity` (kg). Un
// article n'est compté que s'il référence un produit du catalogue vendu au poids
// (`unit: "kg"`) : une ligne libre ou un produit à l'unité n'a pas de poids mérité.
// Le montant est le prix au poids × poids (`price_at_sale` × `quantity`).
//
// V23 : le test porta sur `unitType === "weight"`, un champ supprimé. Il lit `unit`
// désormais — sans ce changement, la boucherie entière disparaissait des rapports de
// poids en silence (0 kg, 0 FCFA) alors que les ventes continuaient d'être encaissées.

/** Agrège les ventes au poids d'une période (items déjà filtrés), par produit. Les
 *  articles vendus à l'unité ou sans produit au catalogue n'ont pas de poids : ils
 *  sont ignorés. */
export function computeWeightSales(
  items: SaleItem[],
  products: Pick<Product, "id" | "name" | "unit">[],
): WeightSalesStats {
  const byProduct = new Map<string, WeightSalesBucket>();
  let weightKg = 0;
  let revenue = 0;
  let count = 0;

  for (const item of items) {
    if (!item.product_id) continue;
    const product = products.find((p) => p.id === item.product_id);
    if (product?.unit !== "kg") continue;
    const w = item.quantity;
    const rev = w * item.price_at_sale;
    weightKg += w;
    revenue += rev;
    count += 1;
    const bucket = byProduct.get(item.product_id);
    if (bucket) {
      bucket.weightKg += w;
      bucket.revenue += rev;
    } else {
      byProduct.set(item.product_id, {
        product_id: item.product_id,
        name: item.name,
        weightKg: w,
        revenue: rev,
      });
    }
  }

  return {
    weightKg,
    revenue,
    avgWeightKg: count > 0 ? weightKg / count : Number.NaN,
    byProduct: Array.from(byProduct.values()).sort((a, b) => b.weightKg - a.weightKg),
  };
}
