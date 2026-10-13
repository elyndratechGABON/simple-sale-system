import type { Product } from "@/lib/db";
import type { ProductCardField } from "@/lib/card-display";
import { ProductCard } from "./ProductCard";

/**
 * Aperçu de la card dans les réglages.
 *
 * Données FABRIQUÉES à la volée : c'est une maquette d'agencement, pas une fiche
 * réelle. Le gabarit est ici parce que l'aperçu doit finir exactement comme la carte
 * de la page, sinon il ne sert plus à rien.
 */
export function ProductCardPreview({ fields }: { fields: ProductCardField[] }) {
  const sample: Product = {
    id: "preview",
    name: "Chaussures sport homme",
    cost: 5000,
    price: 12000,
    stock: 8,
    category: "Chaussures",
    serialNumber: "CH-42",
    type: "product",
    // Champs de synchronisation : sans eux le type n'est pas complet. Sans importance
    // ici — la preview n'est ni stockée ni synchronisée.
    updated_at: 0,
    sync_status: "local",
  };
  return (
    <div className="w-[132px] shrink-0">
      <ProductCard
        product={sample}
        fields={fields}
        state="ok"
        lastSoldAt={Date.now() - 86400000}
        preview
      />
    </div>
  );
}
