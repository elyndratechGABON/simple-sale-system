import { useState } from "react";
import { formatFCFA } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Calculateur manuel : prix de vente, coût d'acquisition, quantité — le bénéfice et la
 *  marge se calculent au fil de la frappe. Ex-« Calculateur de profit » des Paramètres. */
export function ManualCalculator() {
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("1");

  const priceN = Number(price.replace(/\D/g, "")) || 0;
  const costN = Number(cost.replace(/\D/g, "")) || 0;
  const qtyN = Math.max(1, Number(qty.replace(/\D/g, "")) || 1);
  const unitProfit = priceN - costN;
  const profit = unitProfit * qtyN;
  const revenue = priceN * qtyN;
  const margin = revenue > 0 ? profit / revenue : 0;
  const filled = priceN > 0 || costN > 0;
  const positive = unitProfit >= 0;

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-sm font-medium">Estimer avant d'encaisser</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="prop-pack-price" className="text-xs text-muted-foreground">
            Prix de vente
          </Label>
          <Input
            id="prop-pack-price"
            inputMode="numeric"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            className="h-10 text-right tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="prop-pack-cost" className="text-xs text-muted-foreground">
            Coût
          </Label>
          <Input
            id="prop-pack-cost"
            inputMode="numeric"
            placeholder="0"
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
            className="h-10 text-right tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="prop-pack-qty" className="text-xs text-muted-foreground">
            Qté
          </Label>
          <Input
            id="prop-pack-qty"
            inputMode="numeric"
            placeholder="1"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
            className="h-10 text-right tabular-nums"
          />
        </div>
      </div>

      {filled ? (
        <div className="mt-3 space-y-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Bénéfice ({qtyN} vente{qtyN > 1 ? "s" : ""})
            </span>
            <span
              className={cn(
                "font-bold tabular-nums",
                positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {formatFCFA(profit)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Marge</span>
            <span className="font-medium tabular-nums">
              {revenue > 0 ? `${Math.round(margin * 100)} %` : "—"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all duration-300",
                positive ? "bg-primary" : "bg-destructive",
              )}
              style={{ width: `${Math.max(0, Math.min(100, margin * 100))}%` }}
            />
          </div>
          {priceN > 0 && costN > 0 && !positive && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Ce prix ne couvre pas le coût d'acquisition.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Le résultat apparaît ici dès qu'un prix ou un coût est saisi.
        </p>
      )}
    </div>
  );
}
