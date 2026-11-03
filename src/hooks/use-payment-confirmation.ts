// CONFIRMATION de paiement côté caisse (mission paiement) : le drapeau
// `payment_confirmation_pending` posé au dépôt de la demande n'est consommé QU'À
// l'approbation serveur (`subscription_request.approved`, rendu par le handshake).
// Cette requête re-poll est BORNÉE : tant que la demande n'a pas Abouti, elle
// reconsulte toutes les 10 s page visible — dès qu'elle Aboutit, un toast annonce
// l'activation et le drapeau est purgé (le message est one-shot).
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clearPaymentConfirmationPending,
  getPaymentConfirmationPending,
} from "@/lib/payment-confirmation";
import { getSubscriptionRequest } from "@/lib/gatekeeper";
/** Poll borné + toast unique. À monter sur l'écran « Compte » (le payeur est le patron). */
export function usePaymentConfirmation() {
  const { data: request } = useQuery({
    queryKey: ["subscription_request"],
    queryFn: getSubscriptionRequest,
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const pending = getPaymentConfirmationPending();
    if (!pending) return;
    if (request?.status === "approved") {
      clearPaymentConfirmationPending();
      toast.success("Abonnement activé avec succès !", {
        description: `Palier ${pending.planName} actif sur ${pending.planDevices} appareil${pending.planDevices > 1 ? "s" : ""}.`,
      });
    }
    // `rejected` = paiement douteux : le drapeau est purgé SILENCIEUSEMENT (jamais
    // de message « paiement effectué » quelque part).
    if (request?.status === "rejected") {
      clearPaymentConfirmationPending();
    }
  }, [request?.status]);
}
