import { Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductType = "product" | "service";

interface Props {
  value: ProductType;
  onChange: (value: ProductType) => void;
  disabled?: boolean;
}

/**
 * Segmented control Produit / Service : deux boutons collés dans UNE barre
 * (mission formulaire compact) — l'état sélectionné = fond primaire plein.
 */
export function ProductTypeSelector({ value, onChange, disabled }: Props) {
  const options = [
    { key: "product" as const, icon: Package, label: "Produit" },
    { key: "service" as const, icon: Wrench, label: "Service" },
  ];
  return (
    <div
      className={cn(
        "inline-grid grid-cols-2 gap-0 overflow-hidden rounded-lg border bg-muted/40",
        disabled && "pointer-events-none opacity-50",
      )}
      role="radiogroup"
      aria-label="Type d'article"
    >
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled}
            onClick={() => !disabled && onChange(opt.key)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 px-4 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
