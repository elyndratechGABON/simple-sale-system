import type { Product } from "@/lib/db";
import { CARD_FIELD_LABELS, type ProductCardField } from "@/lib/card-display";
import { formatFCFA, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

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
  const stockText = isService
    ? "Actif"
    : state === "out"
      ? "Rupture de stock"
      : `Stock : ${product.stock}`;

  return (
    <article
      onClick={onOpen}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors",
        onOpen && "cursor-pointer hover:border-primary/40",
      )}
    >
      {/* ── Visuel : conteneur carré imposé (§16). `contain` et non `cover` — une
          photo de produit ne doit jamais être rognée ni déformée. ── */}
      {has("image") && (
        <div className="relative aspect-square w-full overflow-hidden border-b bg-muted/30">
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

/** Une ligne de la card. Un `switch` plutôt qu'une chaîne de condition : l'ordre vient
 *  du tableau `fields`, et un champ absent ne rend tout simplement rien. */
function FieldLine({
  field,
  product,
  state,
  isService,
  stockText,
  lastSoldAt,
}: {
  field: ProductCardField;
  product: Product;
  state: CardStockState;
  isService: boolean;
  stockText: string;
  lastSoldAt?: number;
}) {
  const label = CARD_FIELD_LABELS[field];

  switch (field) {
    case "name":
      return (
        <p className="line-clamp-2 text-xs font-medium leading-tight" title={product.name}>
          {product.name}
        </p>
      );

    case "price":
      return (
        <p className="truncate text-sm font-bold leading-tight text-primary tabular-nums">
          {formatFCFA(product.price)}
        </p>
      );

    case "stock":
      return (
        <p className="flex items-center gap-1 text-[11px] leading-tight">
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              state === "out"
                ? "bg-destructive"
                : state === "low"
                  ? "bg-amber-500"
                  : isService
                    ? "bg-muted-foreground"
                    : "bg-emerald-500",
            )}
          />
          <span
            className={cn(
              "truncate tabular-nums",
              state === "out"
                ? "font-medium text-destructive"
                : state === "low"
                  ? "font-medium text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {stockText}
          </span>
        </p>
      );

    case "status":
      return (
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {label} : {isService ? "prestation" : state === "out" ? "rupture" : state === "low" ? "faible" : "ok"}
        </p>
      );

    case "category":
      return (
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {product.category}
        </p>
      );

    case "cost":
      // `cost` à 0 = « inconnu », pas « gratuit » : l'afficher en vert serait un mensonge.
      return product.cost > 0 ? (
        <p className="truncate text-[11px] leading-tight text-muted-foreground tabular-nums">
          Achat {formatFCFA(product.cost)}
        </p>
      ) : null;

    case "margin": {
      const margin = product.price - product.cost;
      return product.cost > 0 ? (
        <p className="truncate text-[11px] leading-tight text-muted-foreground tabular-nums">
          Marge {formatFCFA(margin)} ({Math.round((margin / product.price) * 100)} %)
        </p>
      ) : null;
    }

    case "reference":
      return product.serialNumber ? (
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          Réf. {product.serialNumber}
        </p>
      ) : null;

    case "variants":
      return product.variants && product.variants.length > 0 ? (
        <p className="truncate text-[11px] leading-tight text-muted-foreground tabular-nums">
          {product.variants.length} variante{product.variants.length > 1 ? "s" : ""}
        </p>
      ) : null;

    case "lastSold":
      return lastSoldAt !== undefined && !isService ? (
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          Vendu {formatRelative(lastSoldAt)}
        </p>
      ) : null;

    default:
      return null;
  }
}

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