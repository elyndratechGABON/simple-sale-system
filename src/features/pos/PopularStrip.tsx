import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PosController } from "./usePos";
import type { Product } from "@/lib/db";

/**
 * Les produits du jour, en un tap : le serveur re-commande sans chercher dans la grille.
 * Masquée dès qu'on cherche ou qu'on filtre — sinon la bande contredirait la sélection
 * courante. Cluster service : respecte l'onglet Prestations/Produits.
 */
export function PopularStrip({
  pos,
  onProductSelect,
}: {
  pos: PosController;
  onProductSelect?: (product: Product) => void;
}) {
  if (pos.search.trim() !== "" || pos.filter !== "Tous" || pos.popular.length === 0) return null;
  const items = pos.popular.filter((p) =>
    pos.isService
      ? pos.serviceTab === "prestations"
        ? p.type === "service"
        : p.type !== "service"
      : true,
  );
  return (
    <div className="chip-row bleed-x mt-5 py-1">
      {items.map((p) => {
        const out = Number.isFinite(p.stock) && p.stock <= 0;
        return (
          <button
            key={p.id}
            type="button"
            disabled={out}
            onClick={() => (onProductSelect ?? pos.onProductClick)(p)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-card pl-1.5 pr-3 text-sm shadow-sm",
              "hover:border-primary active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              out && "opacity-50",
            )}
          >
            {p.photo ? (
              <img
                src={p.photo}
                alt=""
                className="h-8 w-8 rounded-lg object-cover"
                loading="lazy"
              />
            ) : null}
            <span className="font-medium whitespace-nowrap">{p.name}</span>
            <span className="font-bold whitespace-nowrap text-primary tabular-nums">
              {formatFCFA(p.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
