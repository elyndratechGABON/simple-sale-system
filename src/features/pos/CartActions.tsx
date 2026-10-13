import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientSelect } from "@/components/ClientSelect";
import { formatFCFA } from "@/lib/format";
import type { CartLine } from "@/lib/db";
import type { PosController } from "./usePos";

/**
 * Action principale du panneau. Son libellé dit exactement ce qui va se passer : ajouter
 * une tournée n'engage pas d'argent, encaisser clôt l'addition. Trois branches — comptoir,
 * encaissement en cours, ou table ouverte.
 */
export function CartActions({ pos }: { pos: PosController }) {
  if (pos.target.kind === "direct") {
    return (
      <>
        {pos.isService && pos.lines.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="client-name">
              Nom du client
            </label>
            <ClientSelect
              value={pos.clientName}
              onChange={(name, id) => {
                pos.setClientName(name);
                pos.setClientId(id);
              }}
            />
          </div>
        )}
        <Button
          size="lg"
          className="w-full h-16 text-lg gap-2"
          disabled={!pos.canOpenCheckout}
          onClick={() => pos.setCheckoutOpen(true)}
        >
          <CheckCircle2 className="h-5 w-5" />
          Valider la vente
        </Button>
      </>
    );
  }

  if (pos.cashing) {
    return (
      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full h-16 text-lg gap-2"
          disabled={!pos.canValidate || pos.payMut.isPending || pos.payRoundMut.isPending}
          onClick={() =>
            pos.cashing!.kind === "round"
              ? pos.payRoundMut.mutate({
                  saleId: pos.activeTable!.id,
                  orderedAt: pos.cashing!.orderedAt,
                  cash: pos.cash,
                })
              : pos.payMut.mutate({ saleId: pos.activeTable!.id, cash: pos.cash })
          }
        >
          <CheckCircle2 className="h-5 w-5" />
          {pos.cashing.kind === "round"
            ? "Valider l'encaissement de la tournée"
            : "Valider l'encaissement"}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            pos.setCashing(null);
            pos.setCashGiven("");
          }}
        >
          Retour à la commande
        </Button>
      </div>
    );
  }

  // Table branch: target.kind === "table" → activeTable is guaranteed
  const table = pos.activeTable!;
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 gap-2"
        disabled={!table.served_at || table.total <= 0}
        onClick={() => pos.setCashing({ kind: "table" })}
      >
        <CheckCircle2 className="h-4 w-4" />
        Payer {formatFCFA(table.total)}
      </Button>
    </div>
  );
}
