import type { Product } from "@/lib/db";
import { CARD_FIELD_LABELS, type ProductCardField } from "@/lib/card-display";
import { formatFCFA, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CardStockState } from "./ProductCard";

/** Une ligne de la card. Un `switch` plutôt qu'une chaîne de condition : l'ordre vient
 *  du tableau `fields`, et un champ absent ne rend tout simplement rien. */
export function FieldLine({
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
          {label} :{" "}
          {isService
            ? "prestation"
            : state === "out"
              ? "rupture"
              : state === "low"
                ? "faible"
                : "ok"}
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
