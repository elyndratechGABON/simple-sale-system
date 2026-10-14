import { useRef } from "react";
import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import type { Product } from "@/lib/db";

/**
 * Une ligne du batch de coûts : la case à cocher (pour le calcul) et le coût unitaire
 * saisi DIRECTEMENT sur la ligne. Le champ est non contrôlé : il garde ce que le vendeur
 * a tapé, et la sauvegarde n'a lieu qu'au blur — on ne touche pas IndexedDB à chaque
 * frappe.
 */
export function CostBatchRow({
  product,
  selected,
  onToggle,
  onSave,
}: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
  onSave: (id: string, cost: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const saved = product.cost > 0 ? String(product.cost) : "";

  function commit() {
    const input = inputRef.current;
    if (!input) return;
    const raw = input.value.trim();
    const cost = Number(raw);
    // Vide ou illisible : on restaure la valeur connue plutôt que d'écrire un 0 qui
    // effacerait un coût saisi.
    if (raw === "" || Number.isNaN(cost) || cost < 0) {
      input.value = saved;
      return;
    }
    if (cost !== product.cost) onSave(product.id, cost);
  }

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-3 py-2 text-center">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          disabled={product.deleted_at !== undefined}
          aria-label={`Sélectionner ${product.name}`}
        />
      </td>
      <td className="px-3 py-2">
        <span className="block truncate font-medium">{product.name}</span>
        <span className="text-xs text-muted-foreground">{product.category}</span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatFCFA(product.price)}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1.5">
          <Input
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={saved}
            placeholder="—"
            aria-label={`Coût de ${product.name}`}
            className="h-9 w-28 text-right tabular-nums"
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = saved;
                e.currentTarget.blur();
              }
            }}
          />
          {product.cost > 0 && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </div>
      </td>
    </tr>
  );
}
