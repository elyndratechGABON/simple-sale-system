import { memo } from "react";
import { Package, Plus } from "lucide-react";
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
  const unlimited = product.type === "service" || !Number.isFinite(product.stock);
  const remaining = unlimited ? Number.POSITIVE_INFINITY : product.stock - inCart;
  const out = !unlimited && remaining <= 0;
  const low = !unlimited && !out && remaining <= (product.min_stock ?? 5);

  // L'image de la carte : la première variante illustrée d'abord — sinon la photo
  // du produit (posItem) — cf. cardPhotoOf.
  const visuel = cardPhotoOf(product);

  const add = () => {
    if (out) return;
    onAdd(product);
  };

  // Prix affiché avec son libellé : le texte complet sert AUSSI au choix de taille
  // (« Dès 8 999 FCFA » plus long qu'un simple prix → réduction en `text-sm`).
  const priceText =
    (product.variants?.length ?? 0) > 0
      ? `Dès ${formatFCFA(product.price)}`
      : formatFCFA(product.price);

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
        // Alternative clavier à l'appui long (audit design §3) : Maj+Entrée ouvre la
        // saisie manuelle de la quantité, pour qui n'a pas d'écran tactile.
        onKeyDown={(e) => {
          if (!onLongPress || out) return;
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            onLongPress(product);
          }
        }}
        disabled={out}
        aria-label={`Ajouter ${product.name} au panier`}
        title={`Ajouter au panier — Maj+Entrée : quantité manuelle${out ? " — rupture" : ""}`}
        aria-keyshortcuts="Shift+Enter"
        className={cn(
          "flex flex-1 flex-col text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          out ? "cursor-not-allowed" : "active:scale-[0.985] transition-transform",
        )}
      >
        {visuel ? (
          <div className="aspect-square w-full overflow-hidden border-b bg-muted/30">
            <img
              src={visuel}
              alt=""
              loading="lazy"
              // Photo PLEINE dans le cadre : object-cover évite les bandes vides et les
              // étirements (audit design §3). Recadrage maîtrisé par le parent
              // (aspect-square + overflow-hidden) : la reconnaissance de l'article passe
              // par la largeur de l'image, pas par ses marges.
              className="h-full w-full object-cover object-center"
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
          <p className="line-clamp-1 text-[13px] font-medium leading-tight">{product.name}</p>
          <p
            className={cn(
              "mt-auto pt-1 text-xs leading-none",
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

      {/* BANNIÈRE DU BAS (mission fin des prix coupés) : un bloc `mt-auto` à fond
          subtil SUITE à la zone de texte bouton — le "+" ne peut plus chevaucher
          le prix (« Dès 8 999 FCFA » tronqué : la carte réduit en `text-sm`
          automatiquement, et « FCFA » ne descend jamais à la ligne). */}
      <div className="mt-auto flex w-full items-center justify-between gap-2 rounded-b-xl bg-muted/30 px-2.5 py-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate whitespace-nowrap font-bold leading-tight text-primary tabular-nums",
            priceText.length > 14 ? "text-sm" : "text-base",
          )}
        >
          {priceText}
        </span>
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
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            out
              ? "border border-border bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95",
          )}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

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
