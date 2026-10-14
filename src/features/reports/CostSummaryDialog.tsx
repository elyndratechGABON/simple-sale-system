import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { Product } from "@/lib/db";

/**
 * Bénéfice théorique des produits cochés.
 *
 * ATTENTION sur ce que dit ce chiffre : il vaut « SI je vends UNE unité de chacun », au
 * prix de vente actuel. Ce n'est ni le CA de la période, ni une prévision — les
 * quantités vendues ne sont pas connues ici. Un article sans coût saisi est compté à 0,
 * ce qui gonfle son bénéfice : c'est le but de l'écran qui mène ici (renseigner les
 * coûts), pas une erreur d'arrondi.
 */
export function CostSummaryDialog({
  open,
  onOpenChange,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
}) {
  if (products.length === 0) return null;

  const ca = products.reduce((s, p) => s + p.price, 0);
  const couts = products.reduce((s, p) => s + (p.cost > 0 ? p.cost : 0), 0);
  const benefice = ca - couts;
  const marge = ca > 0 ? Math.round((benefice / ca) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Bénéfice — {products.length} produit{products.length > 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">CA (1 unité chacun)</dt>
            <dd className="tabular-nums">{formatFCFA(ca)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Coûts d'achat</dt>
            <dd className="tabular-nums">{formatFCFA(couts)}</dd>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <dt>Bénéfice</dt>
            <dd className="tabular-nums">
              {formatFCFA(benefice)}{" "}
              <span className="text-xs text-muted-foreground">marge {marge} %</span>
            </dd>
          </div>
        </dl>

        <ul className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
          {products.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">{p.name}</span>
              <span className="shrink-0 tabular-nums">
                CA {formatFCFA(p.price)} · Coût {p.cost > 0 ? formatFCFA(p.cost) : "—"}
              </span>
            </li>
          ))}
        </ul>

        <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
      </DialogContent>
    </Dialog>
  );
}
