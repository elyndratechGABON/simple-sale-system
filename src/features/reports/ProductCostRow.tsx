import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import { bulkUpdateCost, type Product } from "@/lib/db";

/**
 * Une ligne de saisie du coût d'un produit VENDU sur la période.
 *
 * COPIE ASSUMÉE de `CostBatchRow` (règle des 3 : on extrait quand un 3ᵉ usage apparaît,
 * pas avant). Différences : deux colonnes de lecture en plus — quantité vendue et prix —
 * pour que le vendeur voie ce que son chiffre a produit.
 *
 * RÈGLE : le coût est saisi À LA CRÉATION du produit (`ProductForm`). Ici on ne
 * l'AFFICHE qu'en lecture seule. Seule exception : coût = 0 (jamais renseigné) —
 * un petit bouton crayon révèle un input de saisie à la demande.
 *
 * `readOnly` verrouille la ligne : produit SUPPRIMÉ du catalogue, il n'existe plus de
 * fiche à mettre à jour. Le coût affiché est celui figé à la vente (`cost_at_sale`).
 */
export function ProductCostRow({
  product,
  quantitySold,
  revenue,
  readOnly = false,
}: {
  product: Product;
  quantitySold: number;
  revenue: number;
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const saved = product.cost > 0 ? String(product.cost) : "";

  async function commit() {
    if (readOnly) return;
    const input = inputRef.current;
    if (!input) return;
    const raw = input.value.trim();
    const cost = Number(raw);
    if (raw === "" || Number.isNaN(cost) || cost < 0) {
      setEditing(false);
      return;
    }
    if (cost === product.cost) {
      setEditing(false);
      return;
    }
    try {
      const updated = await bulkUpdateCost([product.id], cost);
      if (updated === 0) {
        toast.warning("Produit introuvable, coût non enregistré.");
        return;
      }
      toast.success(`${product.name} : coût ${formatFCFA(cost)}`);
      void qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(false);
    } catch {
      // Exception (transaction interrompue). L'écran doit dire la VRAIE valeur : sans
      // retour arrière, l'input afficherait « 20000 » alors que rien n'a été écrit.
      toast.error("Coût non enregistré.");
    }
  }

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 border-b py-2 text-sm last:border-b-0 items-center">
      <span className="min-w-0 truncate font-medium">{product.name}</span>
      <span className="text-right text-muted-foreground tabular-nums whitespace-nowrap">
        <span className="bg-gray-200 px-2 rounded text-xs font-medium">{quantitySold}</span>
      </span>
      <span className="text-right text-muted-foreground tabular-nums whitespace-nowrap">
        {formatFCFA(product.price)}
      </span>
      <div className="flex items-center gap-2">
        {/* Coût renseigné : lecture seule. Coût 0 (non renseigné) : le crayon révèle
            la saisie — c'est la SEULE voie de correction depuis cet écran. */}
        {product.cost > 0 && <Check className="h-4 w-4 shrink-0 text-primary" />}
        {product.cost <= 0 && readOnly && (
          <span
            className="text-xs text-muted-foreground"
            title="Produit supprimé : coût non renseigné"
          >
            —
          </span>
        )}
        {product.cost <= 0 && !readOnly && !editing && (
          <button
            type="button"
            aria-label={`Renseigner le coût de ${product.name}`}
            onClick={() => setEditing(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {product.cost <= 0 && editing && !readOnly && (
          <Input
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={saved}
            placeholder="Coût (FCFA)"
            aria-label={`Coût de ${product.name}`}
            autoFocus
            className="h-9 w-32 text-right tabular-nums bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = saved;
                e.currentTarget.blur();
              }
            }}
          />
        )}
      </div>
      {/* Lecture seule : ce que la catégorie a rapporté, pour situer le coût saisi. */}
      <span className="text-right tabular-nums font-medium">{formatFCFA(revenue)}</span>
    </div>
  );
}
