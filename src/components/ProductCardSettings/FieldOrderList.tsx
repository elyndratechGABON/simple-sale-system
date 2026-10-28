import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CARD_FIELD_LABELS, type ProductCardField } from "@/lib/card-display";

interface FieldOrderListProps {
  fields: ProductCardField[];
  onMove: (field: ProductCardField, delta: 1 | -1) => void;
}

export function FieldOrderList({ fields, onMove }: FieldOrderListProps) {
  if (fields.length <= 1) return null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Ordre d&apos;affichage</Label>
      <p className="text-xs text-muted-foreground">
        Les flèches déplacent le champ d&apos;un cran — plus simple au doigt qu&apos;un
        glisser-déposer.
      </p>
      <div className="space-y-1">
        {fields.map((field, i) => (
          <div
            key={field}
            className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5"
          >
            <span className="w-4 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <span className="flex-1 truncate text-sm">{CARD_FIELD_LABELS[field]}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Monter ${CARD_FIELD_LABELS[field]}`}
              disabled={i === 0}
              onClick={() => onMove(field, -1)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Descendre ${CARD_FIELD_LABELS[field]}`}
              disabled={i === fields.length - 1}
              onClick={() => onMove(field, 1)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
