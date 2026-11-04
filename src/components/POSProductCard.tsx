import { memo, useRef } from "react";
import { Package, Tag } from "lucide-react";
import type { Product } from "@/lib/db";
import { cardPhotoOf } from "@/lib/card-display";
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
 * Le contrat tient en une phrase : un tap n'importe où ajoute au panier — ou ouvre le
 * sélecteur de variantes quand le produit en a (c'est le parent qui décide, via
 * `onAdd`). Le plus long press (dépassement 500 ms au relâchement) ouvre la saisie
 * manuelle de la quantité, jamais un ajout.
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
  const unlimited = product.type === "service" || !Number.isFinite(product.stock);
  const remaining = unlimited ? Number.POSITIVE_INFINITY : product.stock - inCart;
  const out = !unlimited && remaining <= 0;
  const low = !unlimited && !out && remaining <= (product.min_stock ?? 5);

  // L'image de la carte : la première variante illustrée d'abord — sinon la photo
  // du produit (posItem) — cf. cardPhotoOf.
  const visuel = cardPhotoOf(product);

  /** Press TOP horodaté : démasque l'appui long au relâchement pour NE PAS ajouter
   *  un article quand l'intention était d'ouvrir la quantité manuelle. */
  const pressStart = useRef(0);

  // Prix de BASE : le vrai prix du produit (le choix de variante ajuste ensuite en
  // panier). Plus de préfixe « Dès ».
  const priceText = formatFCFA(product.price);
  const variantCount = product.variants?.length ?? 0;

  const handleTap = () => {
    // Appui long = intention différente (quantité manuelle) : taire l'ajout.
    if (Date.now() - pressStart.current > 500) return;
    if (out) return;
    onAdd(product);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      onPointerDown={() => {
        pressStart.current = Date.now();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.(product);
      }}
      // Alternative clavier à l'appui long (audit design §3) : Maj+Entrée ouvre la
      // saisie manuelle de la quantité, pour qui n'a pas d'écran tactile.
      onKeyDown={(e) => {
        if (onLongPress && e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          onLongPress(product);
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTap();
        }
      }}
      aria-label={`Ajouter ${product.name} au panier`}
      title={`Ajouter au panier — Maj+Entrée : quantité manuelle${out ? " — rupture" : ""}`}
      aria-keyshortcuts="Shift+Enter"
      className={cn(
        "relative flex flex-row overflow-hidden rounded-xl border border-border/50",
        "min-h-[100px] flex-row p-3 shadow-sm transition-colors cursor-pointer",
        "bg-card hover:bg-muted/50",
        out
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/60 focus-visible:border-primary/60",
        className,
      )}
    >
      {/* IMAGE (gauche, ~35 %) : carrée, coins arrondis, object-cover dans son cadre. */}
      <div className="aspect-square w-[35%] shrink-0 overflow-hidden rounded-lg bg-muted/30">
        {visuel ? (
          <img
            src={visuel}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          /* Même carré qu'une image : la carte sans photo garde sa hauteur constante. */
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* INFORMATIONS (droite) : respirant — p-2 + h-full ; le nom coupe sur DEUX
          lignes (plus élégant que « degr… »), le prix plus petit si besoin. */}
      <div className="ml-2 flex h-full p-2 min-w-0 flex-1 flex-col justify-between">
        <p className="line-clamp-2 break-words font-semibold text-foreground text-[13px] leading-tight">
          {product.name}
        </p>
        {/* Le stock IMPRIMÉ vient du montant restant APRÈS ce qui est déjà au panier, pas
            du stock brut : afficher 8 alors qu'il ne reste que 3 après 5 au panier
            ferait vendre un article qu'on n'a plus. */}
        <p
          className={cn(
            "mt-0.5 text-xs text-muted-foreground",
            out && "font-medium text-destructive",
            low && "font-medium text-amber-600 dark:text-amber-400",
          )}
        >
          {out ? "Rupture" : unlimited ? "Illimité" : `Stock : ${remaining}`}
        </p>
        {variantCount > 0 && (
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Tag className="h-3 w-3" />
            {variantCount === 1 ? "1 variante" : `${variantCount} variantes`}
          </span>
        )}
        {/* Prix : `text-sm` sur PC standard (`text-base` au-delà) ; `truncate` en
            dernier filet — avec 4 colonnes il NE coupe qu'au-delà de 99 999 FCFA. */}
        <span className="mt-auto max-w-full truncate pt-1 font-bold text-sm lg:text-base text-primary tabular-nums whitespace-nowrap">
          {priceText}
        </span>
      </div>

      {/* Quantité déjà au panier. `aria-live` : le vendeur garde les yeux sur la grille,
          la pastille est le seul retour qu'il obtient sans quitter sa place. */}
      <span
        aria-live="polite"
        className={cn(
          "absolute right-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5",
          "text-xs font-bold tabular-nums shadow-sm",
          inCart > 0 ? "bg-primary text-primary-foreground" : "hidden",
        )}
      >
        {inCart}
      </span>
    </div>
  );
});
