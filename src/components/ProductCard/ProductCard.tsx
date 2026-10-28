import type { Product } from "@/lib/db";
import { type ProductCardField } from "@/lib/card-display";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { FieldLine } from "./FieldLine";

/** États de stock partagés avec la page Stocks. `service` = prestation ou stock illimité. */
export type CardStockState = "service" | "out" | "low" | "ok";

/**
 * Card produit compacte et CONFIGUREURABLE.
 *
 * Rendue verticale : image au-dessus, informations en dessous. La liste `fields`
 * porte à la fois l'ensemble des champs visibles et leur ordre — un seul tableau
 * pour les deux, donc aucun état à garder synchronisé entre deux.
 *
 * La page parente passe `actions` : le menu reste son élément enfant (elle possède les
 * mutations), ici on ne dessine qu'un emplacement d'icône. Aucune duplication.
 */
export function ProductCard({
  product,
  fields,
  state,
  lastSoldAt,
  onOpen,
  actions,
  preview = false,
}: {
  product: Product;
  fields: ProductCardField[];
  state: CardStockState;
  /** Dernière vente connue, en ms. Absent = jamais vendu depuis le suivi. */
  lastSoldAt?: number;
  onOpen?: () => void;
  /** Menu d'actions rendu par la page (elle détient les mutations). */
  actions?: React.ReactNode;
  /** Mode aperçu des réglages : ni clic ni menu. */
  preview?: boolean;
}) {
  const has = (f: ProductCardField) => fields.includes(f);
  const isService = state === "service";

  // Rupture se dit en toutes lettres : « 0 » se lit comme un stock réellement vide,
  // l'utilisateur doit comprendre que la fiche est à recommander.
  // Sur un produit à variantes, `product.stock` est la somme des variantes : « Rupture de
  // stock » ne doit nommer QUE les variantes réellement épuisées, sinon une taille en rayon
  // fait croire à la rupture du produit entier.
  const variantes = product.variants ?? [];
  const stockText = isService
    ? "Actif"
    : state === "out"
      ? variantes.length > 0
        ? `Épuisé : ${variantes
            .filter((v) => (v.stock ?? 0) <= 0)
            .map((v) => v.name)
            .join(", ")}`
        : "Rupture de stock"
      : variantes.length > 0
        ? `${variantes.filter((v) => (v.stock ?? 0) > 0).length}/${variantes.length} variantes`
        : `Stock : ${product.stock}`;

  return (
    <article
      onClick={onOpen}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl bg-card transition-colors",
        onOpen && "cursor-pointer hover:bg-primary/5",
      )}
    >
      {/* ── Visuel : conteneur carré imposé (§16). `contain` et non `cover` — une
          photo de produit ne doit jamais être rognée ni déformée. ── */}
      {has("image") && (
        <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
          {product.photo ? (
            <img
              src={product.photo}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain object-center"
            />
          ) : (
            /* Même hauteur exactement qu'une image : la grille ne se décale pas. */
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <Package className="h-6 w-6" />
              <span className="text-[10px]">Pas d&apos;image</span>
            </div>
          )}
          {actions && (
            <div className="absolute right-1 top-1" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 p-2">
        {fields
          .filter((f) => f !== "image")
          .map((field) => (
            <FieldLine
              key={field}
              field={field}
              product={product}
              state={state}
              isService={isService}
              stockText={stockText}
              lastSoldAt={lastSoldAt}
            />
          ))}

        {preview && (
          <p className="mt-auto pt-1 text-[10px] text-muted-foreground">
            Aperçu — {fields.length} champ{fields.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </article>
  );
}
