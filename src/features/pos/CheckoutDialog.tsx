import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/lib/db";
import { PAYMENT_METHODS, QUICK_AMOUNTS } from "./pos-constants";
import type { PosController } from "./usePos";

/**
 * Étape d'encaissement du comptoir : le total est figé en haut, on saisit l'argent reçu,
 * la monnaie se calcule en direct. C'est ICI et pas avant que l'argent entre en jeu —
 * pendant la prise de commande, le panier reste un récapitulatif.
 */
export function CheckoutDialog({ pos }: { pos: PosController }) {
  return (
    <Dialog open={pos.checkoutOpen} onOpenChange={pos.setCheckoutOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encaissement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-accent p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total à payer</p>
            <p className="text-4xl font-bold text-primary tabular-nums">{formatFCFA(pos.total)}</p>
          </div>

          {/* Empilés sur petit écran : « Mobile Money » en 3 colonnes de ~74px débordait de
              sa cellule ; côte à côte dès que la modale a la place. */}
          <div className="grid grid-cols-1 gap-1 min-[400px]:grid-cols-3">
            {PAYMENT_METHODS.map((m) => (
              <Button
                key={m.id}
                size="sm"
                className="h-11 min-[400px]:h-9"
                variant={pos.payMethod === m.id ? "default" : "outline"}
                onClick={() => pos.setPayMethod(m.id)}
              >
                {m.label}
              </Button>
            ))}
          </div>

          {pos.payMethod === "cash" ? (
            <>
              <label className="text-sm font-medium" htmlFor="checkout-cash">
                Argent donné
              </label>
              <Input
                id="checkout-cash"
                autoFocus
                inputMode="numeric"
                value={pos.cashGiven}
                onChange={(e) => pos.setCashGiven(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="h-16 text-center text-3xl font-bold tabular-nums"
              />
              <div className="flex flex-wrap gap-1">
                {QUICK_AMOUNTS.map((amt) => (
                  <Button
                    key={amt}
                    variant="secondary"
                    className="h-11 min-[400px]:h-8 px-3"
                    onClick={() => pos.setCashGiven(String((Number(pos.cashGiven) || 0) + amt))}
                  >
                    +{formatFCFA(amt)}
                  </Button>
                ))}
                <Button variant="ghost" className="h-11 min-[400px]:h-8 px-3" onClick={() => pos.setCashGiven("")}>
                  Vider
                </Button>
              </div>

              <div
                className={cn(
                  "rounded-lg p-4 flex items-center justify-between",
                  pos.insufficient ? "bg-destructive/10" : "bg-accent",
                )}
              >
                <span className="font-semibold">
                  {pos.insufficient ? "Manque" : "Monnaie à rendre"}
                </span>
                <span
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    pos.insufficient ? "text-destructive" : "text-primary",
                  )}
                >
                  {formatFCFA(Math.abs(pos.change))}
                </span>
              </div>
              {pos.insufficient && (
                <p className="text-sm text-destructive">
                  Montant insuffisant. Demander au moins {formatFCFA(pos.dueTotal)}.
                </p>
              )}
            </>
          ) : (
            // Hors espèces, le débit est exact — pas d'argent physique, pas de monnaie.
            <div className="rounded-lg p-4 flex items-center justify-between bg-accent">
              <span className="font-semibold">Débité exactement</span>
              <span className="text-3xl font-bold text-primary tabular-nums">
                {formatFCFA(pos.total)}
              </span>
            </div>
          )}

          <Button
            size="lg"
            className="w-full h-14 text-lg gap-2"
            disabled={!pos.canValidate || pos.saleMut.isPending}
            onClick={() =>
              pos.saleMut.mutate({
                lines: pos.lines.map(({ key: _key, ...line }): CartLine => line),
                cash_given: pos.payMethod === "cash" ? pos.cash : pos.dueTotal,
                customers_count: pos.customers,
                payment_method: pos.payMethod,
                ...(pos.clientName.trim() ? { client_name: pos.clientName.trim() } : {}),
                ...(pos.clientId ? { client_id: pos.clientId } : {}),
              })
            }
          >
            <CheckCircle2 className="h-5 w-5" />
            Valider l'encaissement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
