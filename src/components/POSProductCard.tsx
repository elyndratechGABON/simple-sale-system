import { memo } from "react";
import { Package, Plus } from "lucide-react";
import type { Product } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Card produit de la CAISSE — et uniquement de la caisse.
 *
 * Ce composant n'a rien à voir avec `ProductCard` (page Stocks), qui sert à ADMINISTRER :
 * prix d'achat, marge, référence, édition du nom, changement de photo, menu d'actions.
 * Ici le vendeur vend : l'image sert à reconnaître l'article, le prix à l'annoncer, le
 * stock à savoir s'il reste quelque chose. Tout le reste lui vole de la place et le
 * ralentit — au dixième article de la journée, pas au centième.
 *
 * Le contrat tient en une phrase : un tap ajoute au panier. Pas d'ouverture de fiche,
 * pas de dialogue. La fiche produit reste un outil de gestion, il vit dans Stocks.
 *
 * L'image est en `object-contain` (et non `cover`) : une photo de produit rognée
 * empêche de reconnaître l'article — c'est le défaut numéro un sur une caisse.
 */
export const POSProductCard = memo(function POSProductCard({
  product,
  /** Article ajouté à la carte : sert au badge de quantité. */
  inCart = 0,
  onAdd,
  onLongPress,
  className,
}: {
  product: Product;
  inCart?: number;
  onAdd: (product: Product) => void;
  /** Appui long : saisie manuelle de la quantité. Absent = le tap simple suffit. */
  onLongPress?: (product: Product) => void;
  className?: string;
}) {
  // Stock INFINI (prestation, service) : pas d'alerte de rupture possible.
  const unlimited = !Number.isFinite(product.stock);
  const remaining = unlimited ? Number.POSITIVE_INFINITY : product.stock - inCart;
  const out = !unlimited && remaining <= 0;
  const low = !unlimited && !out && remaining <= (product.min_stock ?? 5);

  const add = () => {
    if (out) return;
    onAdd(product);
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card",
        "transition-colors",
        out
          ? "border-border opacity-60"
          : "border-border hover:border-primary/50 focus-within:border-primary/60",
        className,
      )}
    >
      {/* Le stock IMPRIMÉ vient du montant restant APRÈS ce qui est déjà au panier, pas
          du stock brut : afficher 8 alors qu'il ne reste que 3 après 5 au panier
          ferait vendre un article qu'on n'a plus. */}
      <button
        type="button"
        onClick={add}
        disabled={out}
        aria-label={`Ajouter ${product.name} au panier`}
        className={cn(
          "flex flex-1 flex-col text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          out ? "cursor-not-allowed" : "active:scale-[0.985] transition-transform",
        )}
      >
        {product.photo ? (
          <div className="aspect-square w-full overflow-hidden border-b bg-muted/30">
            <img
              src={product.photo}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain object-center p-1"
            />
          </div>
        ) : (
          /* Même hauteur qu'une image — sinon la carte sans photo fait deux fois moins
             haute et la grille se désaligne. */
          <div className="flex aspect-square w-full items-center justify-center border-b bg-muted/25 text-muted-foreground">
            <Package className="h-7 w-7" />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-0.5 p-2.5">
          <p className="line-clamp-2 text-[13px] font-medium leading-tight">{product.name}</p>
          <p className="text-base font-bold leading-tight text-primary tabular-nums">
            {formatFCFA(product.price)}
          </p>
          <p
            className={cn(
              "mt-auto pt-1 text-[11px] leading-none",
              out
                ? "font-medium text-destructive"
                : low
                  ? "font-medium text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {out ? "Rupture" : unlimited ? "Illimité" : `Stock : ${remaining}`}
          </p>
        </div>
      </button>

      {/* Bouton « + » explicite : sur mobile le tap sur la carte est parfois imprécis,
          et le vendeur vise l'angle en bas à droite. Les deux cibles font la même chose,
          donc aucune n'est un piège. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          add();
        }}
        onPointerDown={(e) => {
          if (!onLongPress) return;
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress?.(product);
        }}
        disabled={out}
        aria-label={`Ajouter ${product.name}`}
        className={cn(
          "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          out
            ? "border border-border bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95",
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>

      {/* Quantité déjà au panier. `aria-live` : le vendeur garde les yeux sur la grille,
          la pastille est le seul retour qu'il obtient sans quitter sa place. */}
      <span
        aria-live="polite"
        className={cn(
          "absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5",
          "text-xs font-bold tabular-nums shadow-sm",
          inCart > 0 ? "bg-primary text-primary-foreground" : "hidden",
        )}
      >
        {inCart}
      </span>
    </div>
  );
});
