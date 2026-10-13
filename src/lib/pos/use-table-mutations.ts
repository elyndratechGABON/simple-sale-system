// Mutations de TABLE : ouvrir, libérer, cycle de cuisine, tournée, encaissement,
// annulation.
//
// Séparées des mutations de vente (`use-sale-mutations`) parce qu'elles ne partagent
// aucun état : une addition ouverte ne sait rien du paiement de comptoir, et l'inverse.
//
// Chaque mutation signe son succès par un CALLBACK reçu en paramètre. Aucune ne lit
// l'état de la page : c'est ce qui garantit qu'il n'existe qu'un seul chemin vers le
// panier et la destination courante.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cancelSale, closeTable, openTable, payRound, payTable, type Sale } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { useSaleTrigger } from "@/hooks/use-sale-trigger";

export function useTableMutations(hooks: {
  /** Après ouverture : viser la table et vider le panier. */
  onTableOpened: (sale: Sale) => void;
  /** Après libération : revenir au comptoir UNIQUEMENT si c'était la table visée. */
  onTableReleased: (saleId: string) => void;
  /** Après une tournée : vider le panier, l'addition reste ouverte. */
  onRoundAdded: (sale: Sale) => void;
  /** Après un encaissement de table : revenir au comptoir. */
  onTableSettled: () => void;
  /** Après une tournée encaissée : fermer le panneau de rendu de monnaie. */
  onRoundPaid: (sale: Sale) => void;
  /** Après une annulation : fermer le PIN, revenir au comptoir. */
  onTableCancelled: () => void;
}) {
  const qc = useQueryClient();
  const { notifyOwner } = useSaleTrigger();
  const {
    onTableOpened,
    onTableReleased,
    onRoundAdded,
    onTableSettled,
    onRoundPaid,
    onTableCancelled,
  } = hooks;

  const openMut = useMutation({
    mutationFn: (label: string) => openTable(label),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      onTableOpened(sale);
      toast.success(`Table ${sale.table} ouverte`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Libération d'une table ouverte par erreur, cf. `closeTable` : refusée dès qu'une
  // tournée est passée, c'est alors « Annuler la table » et son PIN.
  const closeMut = useMutation({
    mutationFn: (saleId: string) => closeTable(saleId),
    onSuccess: (_void, saleId) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      onTableReleased(saleId);
      toast.success("Table libérée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMut = useMutation({
    mutationFn: ({ saleId, cash }: { saleId: string; cash: number }) => payTable(saleId, cash),
    onSuccess: (sale) => {
      // `products` aussi : encaisser une table SORT le stock des plateaux, et l'écran
      // Caisse comme l'accueil affichaient encore l'ancienne quantité. Les ventes au
      // comptoir le faisaient déjà — l'encaissement de table avait été oublié.
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale_items", sale.id] });
      toast.success(`Table ${sale.table} encaissée`, {
        description: `Total ${formatFCFA(sale.total)} · Rendu ${formatFCFA(sale.change_due)}`,
      });
      onTableSettled();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Encaissement d'une TOURNÉE : la table reste ouverte, seules les lignes de cette
  // tournée passent en vente réglée (cf. payRound). L'invalidation du préfixe ["sales"]
  // rafraîchit le plan de salle, l'addition et l'historique d'un coup.
  const payRoundMut = useMutation({
    mutationFn: (input: { saleId: string; orderedAt: number; cash: number }) =>
      payRound(input.saleId, input.orderedAt, input.cash),
    onSuccess: (sale) => {
      // Même raison que `payMut` : l'encaissement d'une tournée déstoc, donc `products`
      // doit être invalidé — sans quoi les autres écrans gardent l'ancienne quantité.
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale_items", sale.id] });
      notifyOwner(); // Trigger temps réel propriétaire + son
      toast.success(`Tournée encaissée sur la table ${sale.table}`, {
        description: `Total ${formatFCFA(sale.total)} · Rendu ${formatFCFA(sale.change_due)}`,
      });
      onRoundPaid(sale);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelTableMut = useMutation({
    // `cancelSale` restaure déjà le stock et supprime logiquement vente et lignes : une
    // addition ouverte est une vente comme une autre, il n'y a pas de seconde annulation
    // à écrire.
    mutationFn: (saleId: string) => cancelSale(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Table annulée, stock restauré");
      onTableCancelled();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    openMut,
    closeMut,
    payMut,
    payRoundMut,
    cancelTableMut,
  };
}
