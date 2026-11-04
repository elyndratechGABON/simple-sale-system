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
 * pas d'ouvrir du dialogue. La fiche produit reste un outil de gestion, il vit dans Stocks.
 *
 * PHASE 2 (cahier des charges mission « cartes POS mobile ») : carte COMPACTE
 * flex-row, image 35 % à gauche, texte à droite, prix ET bouton « + » alignés en
 * bas de la colonne. Aucune bande colorée : le seul signal visuel de stock c'est
 * le TEXTE (rupture en `destructive`).
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
  // (« Dès 8 999 FCFA » plus long qu'un simple prix → réduction en `text-sm`),
  // le FCFA ne descend JAMAIS à la ligne (whitespace-nowrap, sans truncate).
  const priceText =
    (product.variants?.length ?? 0) > 0
      ? `Dès ${formatFCFA(product.price)}`
      : formatFCFA(product.price);

  return (
    <div
      className={cn(
        "relative flex h-full flex-row overflow-hidden rounded-xl border border-border/50",
        "bg-white p-3 shadow-sm transition-colors dark:bg-card",
        out ? "opacity-60" : "hover:border-primary/50 focus-within:border-primary/60",
        className,
      )}
    >
      {/* Zone de tap ENTIERE de la carte : un calque transparent au-dessus du contenu.
          Un <button> dans le flux rendrait le bouton « + » imbriqué (HTML prohibé). */}
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
        className="absolute inset-0 z-0 cursor-default focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />

      {/* IMAGE (gauche, ~32 %) : carrée, coins arrondis, object-cover dans son cadre. */}
      <div className="aspect-square w-[33%] shrink-0 overflow-hidden rounded-lg bg-muted/30">
        {visuel ? (
          <img
            src={visuel}
            alt=""
            loading="lazy"
            decoding="async"
            // Photo PLEINE dans le cadre : object-cover évite les bandes vides et les
            // étirements (audit design §3). Recadrage maîtrisé par le parent
            // (aspect-square + overflow-hidden) : la reconnaissance de l'article passe
            // par la largeur de l'image, pas par ses marges.
            className="h-full w-full object-cover object-center"
          />
        ) : (
          /* Même carré qu'une image : la carte sans photo garde sa hauteur constante. */
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* INFORMATIONS (droite) : nom (2 lignes max) + stock au sommet, prix et
          bouton « + » cloués au bas de la colonne. Le conteneur `justify-between`
          jette le bas EN BAS même quand le nom prend 1 ou 2 lignes. */}
      <div className="ml-2.5 flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <p className="line-clamp-2 break-words font-semibold text-foreground text-[13px] leading-tight">
            {product.name}
          </p>
        </div>
        {/* Le stock IMPRIMÉ vient du montant restant APRÈS ce qui est déjà au panier, pas
            du stock brut : afficher 8 alors qu'il ne reste que 3 après 5 au panier
            ferait vendre un article qu'on n'a plus. Rupture/stock bas gardent leur
            signal coloré — jamais une bande montée en bordure. */}
        <p
          className={cn(
            "text-xs text-muted-foreground",
            out && "font-medium text-destructive",
            low && "font-medium text-amber-600 dark:text-amber-400",
          )}
        >
          {out ? "Rupture" : unlimited ? "Illimité" : `Stock : ${remaining}`}
        </p>
        {/* Prix + bouton : `flex-wrap` — quand la largeur manque (mobile 2 colonnes),
            le prix passe sur sa propre ligne AU-DESSUS du bouton : jamais coupé,
            jamais chevauchant. Le prix se réduit légèrement sur libellé long. */}
        <div className="mt-1.5 flex w-full flex-wrap items-end justify-between gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "font-bold leading-tight text-primary tabular-nums whitespace-nowrap",
              priceText.length > 14 ? "text-xs xs:text-[13px]" : "text-[15px] xs:text-base",
              "min-w-0",
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
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary",
              "text-primary-foreground transition-colors focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              out ? "bg-muted text-muted-foreground" : "hover:bg-primary/90 active:scale-95",
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
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
