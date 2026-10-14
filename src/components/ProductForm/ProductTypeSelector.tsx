import { Package, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductType = "product" | "service";

/**
 * Le choix PRODUIT / SERVICE — deux cartes qui disent à quoi sert le choix.
 *
 * Ce n'est pas cosmétique : il commande le stock, les variantes et le champ coût. Un
 * commerçant qui répond « les deux » (un menu qui vend des plats et des boissons) hésite
 * devant deux boutons nus ; il faut donc dire ce que l'application fera de son choix.
 */
export function ProductTypeSelector({
  value,
  onChange,
}: {
  value: ProductType;
  onChange: (type: ProductType) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">Ce que vous vendez</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <TypeCard
          active={value === "product"}
          onClick={() => onChange("product")}
          icon={<Package className="h-4 w-4" />}
          title="Un produit"
          lines={["À acheter puis à revendre", "Coût d'achat saisi ici"]}
        />
        <TypeCard
          active={value === "service"}
          onClick={() => onChange("service")}
          icon={<Scissors className="h-4 w-4" />}
          title="Une prestation"
          lines={["Durée, forfait, main-d'œuvre", "Sans stock, coût global en Comptabilité"]}
        />
      </div>
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  lines,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </span>
      <span className="mt-1 block space-y-0.5">
        {lines.map((line) => (
          <span key={line} className="block text-xs text-muted-foreground">
            {line}
          </span>
        ))}
      </span>
    </button>
  );
}
