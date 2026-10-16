import { cn } from "@/lib/utils";

type ProductType = "product" | "service";

interface Props {
  value: ProductType;
  onChange: (value: ProductType) => void;
  disabled?: boolean;
}

/**
 * Sélecteur unifié Produit / Service (compact, sans puces superflues).
 */
export function ProductTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-2", disabled && "opacity-50 pointer-events-none")}
      role="radiogroup"
      aria-label="Type d'article"
    >
      <TypeCard
        selected={value === "product"}
        onClick={() => !disabled && onChange("product")}
        disabled={disabled}
        icon="📦"
        title="Produit"
        subtitle="Coût d'achat & stock"
      />
      <TypeCard
        selected={value === "service"}
        onClick={() => !disabled && onChange("service")}
        disabled={disabled}
        icon="🛠"
        title="Service"
        subtitle="Sans stock, coût global"
      />
    </div>
  );
}

interface TypeCardProps {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: string;
  title: string;
  subtitle: string;
}

function TypeCard({ selected, onClick, disabled, icon, title, subtitle }: TypeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border p-3 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex-shrink-0 text-xl" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="block text-[11px] text-muted-foreground truncate">{subtitle}</span>
        </div>
      </div>
      {selected && (
        <span
          className="absolute top-2 right-2 h-4 w-4 rounded-full border border-primary bg-primary text-primary-foreground flex items-center justify-center text-[9px]"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </button>
  );
}
