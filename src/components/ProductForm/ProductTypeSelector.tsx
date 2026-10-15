import { cn } from "@/lib/utils";

type ProductType = "product" | "service";

interface Props {
  value: ProductType;
  onChange: (value: ProductType) => void;
  disabled?: boolean;
}

/**
 * Sélecteur unifié Produit / Service.
 *
 * 1 design, 3 écrans : onboarding, stocks, édition.
 * L'intention du choix est explicite : coût d'achat + stock vs coût global sans stock.
 */
export function ProductTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <div
      className={cn(
        "grid gap-3",
        "grid-cols-2",
        "sm:grid-cols-2",
        "max-w-[360px]",
        disabled && "opacity-50 pointer-events-none",
      )}
      role="radiogroup"
      aria-label="Type d'article"
    >
      <TypeCard
        selected={value === "product"}
        onClick={() => !disabled && onChange("product")}
        disabled={disabled}
        icon="📦"
        title="Produit"
        subtitle="Je connais son coût d'achat à l'avance"
        bullets={["Coût saisi ici", "Stock géré"]}
      />
      <TypeCard
        selected={value === "service"}
        onClick={() => !disabled && onChange("service")}
        disabled={disabled}
        icon="🛠"
        title="Service"
        subtitle="Coût global en Comptabilité"
        bullets={["Pas de coût unitaire", "Sans stock"]}
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
  bullets: string[];
}

function TypeCard({ selected, onClick, disabled, icon, title, subtitle, bullets }: TypeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border p-4 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 text-2xl" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="block mt-1 text-xs text-muted-foreground">{subtitle}</span>
          <ul className="mt-3 space-y-1" role="list">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="flex-shrink-0 text-primary">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {selected && (
        <span
          className="absolute top-2 right-2 h-5 w-5 rounded-full border border-primary bg-primary text-primary-foreground flex items-center justify-center text-[10px]"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </button>
  );
}
