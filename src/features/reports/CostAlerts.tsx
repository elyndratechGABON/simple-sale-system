import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product } from "@/lib/db";

const SHOWN = 5;

interface CostAlertsProps {
  sold: Product[];
  global: Product[];
  onOpenCostBatch: (ids: string[]) => void;
}

/**
 * Deux périmètres pour un même défaut : les articles VENDUS sans coût (le bénéfice de la
 * période est surestimé) et le catalogue ENTIER sans coût (nettoyage). Le toggle démarre
 * sur « Vendus » : c'est le seul des deux qui change un chiffre affiché.
 */
export function CostAlerts({ sold, global, onOpenCostBatch }: CostAlertsProps) {
  const [view, setView] = useState<"sold" | "global">("sold");
  if (sold.length === 0 && global.length === 0) return null;

  const list = view === "sold" ? sold : global;
  const shown = list.slice(0, SHOWN);
  const rest = list.length - shown.length;

  return (
    <Card className={sold.length > 0 ? "border-orange-300" : undefined}>
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {sold.length > 0
              ? `${sold.length} produit${sold.length > 1 ? "s" : ""} vendu${sold.length > 1 ? "s" : ""} sans coût — bénéfice surestimé`
              : "Produits sans coût"}
          </h2>
          <Tabs value={view} onValueChange={(v) => setView(v as "sold" | "global")}>
            <TabsList>
              <TabsTrigger value="sold">Vendus ({sold.length})</TabsTrigger>
              <TabsTrigger value="global">Global ({global.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ul className="space-y-1 text-sm">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{p.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">sans coût</span>
            </li>
          ))}
        </ul>
        {rest > 0 && <p className="text-xs text-muted-foreground">+ {rest} autres</p>}

        <Button
          size="sm"
          className="w-full"
          onClick={() => onOpenCostBatch(shown.map((p) => p.id))}
        >
          Saisir les coûts
        </Button>
      </CardContent>
    </Card>
  );
}
