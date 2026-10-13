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
  if (!pos.activeTable) {
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

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full h-16 text-lg gap-2"
        disabled={pos.lines.length === 0 || pos.roundMut.isPending}
        onClick={() =>
          pos.roundMut.mutate({
            saleId: pos.activeTable!.id,
            lines: pos.lines.map(({ key: _key, ...line }): CartLine => line),
          })
        }
      >
        <Plus className="h-5 w-5" />
        Prendre la commande
      </Button>
      {/* « Servir » n'apparaît que si la table n'est pas encore marquée servie.
          C'est le verrou : tant que le plat n'a pas quitté la cuisine, le
          paiement reste bloqué. */}
      {!pos.activeTable.served_at && pos.activeTable.total > 0 && (
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 gap-2 border-orange-400 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-400/50 dark:hover:bg-orange-950/30"
          disabled={pos.serveMut.isPending}
          onClick={() => pos.serveMut.mutate(pos.activeTable!.id)}
        >
          <CheckCircle2 className="h-4 w-4" />
          Servir la commande
        </Button>
      )}
      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 gap-2"
        disabled={!pos.activeTable.served_at || pos.activeTable.total <= 0}
        onClick={() => pos.setCashing({ kind: "table" })}
      >
        <CheckCircle2 className="h-4 w-4" />
        Payer {formatFCFA(pos.activeTable.total)}
      </Button>
    </div>
  );
}
