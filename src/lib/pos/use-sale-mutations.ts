// Mutations de VENTE : la vente directe au comptoir, et la clôture de journée.
//
// Distinctes des mutations de table (`use-table-mutations`) parce qu'elles ne
// partagent aucun état : vendre au comptoir ne connaît pas les additions, clôturer la
// journée ne connaît ni l'une ni l'autre. Les regrouper aurait fait un fichier qui
// parle des deux et ne s'explique ni l'un ni l'autre.
//
// Chaque mutation reçoit ce qu'elle doit écrire en PARAMÈTRE et signale son succès par
// un CALLBACK. Elle ne lit jamais l'état de la page : `PosPage` reste seule propriétaire
// du panier, sinon il y aurait deux chemins vers le même état.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { closeDay, createSale, type CartLine, type Sale } from "@/lib/db";
import { playSuccessChime } from "@/lib/success-sound";

/** Ce que la vente directe doit écrire. Construit par la page, jamais lu par la base. */
export type SaleInput = {
  lines: CartLine[];
  cash_given: number;
  customers_count: number;
  payment_method: "cash" | "card" | "mobile_money";
  client_name?: string;
  client_id?: string;
};

export function useSaleMutations(hooks: {
  /** Après encaissement : fermer le panneau, vider le panier, afficher le ticket. */
  onSold: (sale: Sale) => void;
  /** Après clôture de journée : fermer le dialogue. */
  onDayClosed: (count: number) => void;
}) {
  const qc = useQueryClient();
  const { onSold, onDayClosed } = hooks;

  const saleMut = useMutation({
    mutationFn: (input: SaleInput) => createSale(input),
    onSuccess: (sale) => {
      // `products` aussi : encaisser sort le stock, et l'accueil comme le catalogue
      // affichaient encore l'ancienne quantité.
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      playSuccessChime();
      onSold(sale);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDayMut = useMutation({
    mutationFn: () => closeDay(),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      onDayClosed(n);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { saleMut, closeDayMut };
}
