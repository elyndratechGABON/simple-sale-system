import { useRef } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import { bulkUpdateCost, type Product } from "@/lib/db";

/**
 * Une ligne de saisie du coût d'un produit VENDU sur la période.
 *
 * COPIE ASSUMÉE de `CostBatchRow` (règle des 3 : on extrait quand un 3ᵉ usage apparaît,
 * pas avant). Différences : deux colonnes de lecture en plus — quantité vendue et prix —
 * pour que le vendeur voie ce que son chiffre procured.
 *
 * ENREGISTREMENT AU BLUR, jamais débouncé : un debounce écrit pendant la frappe (« 2 »
 * puis « 20 » au lieu de « 20 000 ») — cf. ERR-UI-001.
 */
export function ProductCostRow({
  product,
  quantitySold,
  revenue,
}: {
  product: Product;
  quantitySold: number;
  revenue: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const saved = product.cost > 0 ? String(product.cost) : "";

  async function commit() {
    const input = inputRef.current;
    if (!input) return;
    const raw = input.value.trim();
    const cost = Number(raw);
    // Vide, illisible ou négatif : on restaure la valeur connue plutôt que d'écrire un 0
    // qui effacerait un coût saisi.
    if (raw === "" || Number.isNaN(cost) || cost < 0) {
      input.value = saved;
      return;
    }
    if (cost === product.cost) return;

    try {
      const updated = await bulkUpdateCost([product.id], cost);
      if (updated === 0) {
        // Produit supprimé entre-temps : `bulkUpdateCost` l'ignore en silence.
        input.value = saved;
        toast.warning("Produit introuvable, coût non enregistré.");
        return;
      }
      toast.success(`${product.name} : coût ${formatFCFA(cost)}`);
    } catch {
      // Exception (transaction interrompue). L'écran doit dire la VRAIE valeur : sans
      // retour arrière, l'input affiche « 20000 » alors que rien n'a été écrit — même
      // classe de mensonge que le debounce, donc même correction.
      input.value = saved;
      toast.error("Coût non enregistré.");
    }
  }

  return (
    <div className="flex items-center gap-2 border-b py-2 text-sm last:border-b-0">
      <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
      <span className="w-12 shrink-0 text-right text-muted-foreground tabular-nums">
        ×{quantitySold}
      </span>
      <span className="w-24 shrink-0 text-right text-muted-foreground tabular-nums">
        {formatFCFA(product.price)}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
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
      {/* Lecture seule : ce que la catégorie a rapporté, pour situer le coût saisi. */}
      <span className="w-24 shrink-0 text-right tabular-nums">{formatFCFA(revenue)}</span>
    </div>
  );
}
