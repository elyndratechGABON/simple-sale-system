// Politique de remboursement — page publique /legal/refund.
//
// Cohérente avec les paliers 30 jours payés par mobile money (synthèse : message
// de référence = transaction du jour, aucune carte, aucun abonnement automatique).
import { createFileRoute } from "@tanstack/react-router";
import { LegalContact, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/legal/refund")({
  head: () => ({
    meta: [
      { title: "Politique de remboursement — ELYNDRA CAISSE" },
      {
        name: "description",
        content:
          "Les conditions de remboursement des abonnements ELYNDRA CAISSE, payés par mobile money.",
      },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalPage title="Politique de remboursement" lastUpdated="septembre 2026">
      <LegalSection title="1. Essai gratuit">
        <p>
          Chaque compte bénéficie d'un essai gratuit de 30 jours, sans carte ni paiement. Vous
          n'êtes jamais facturé pendant cette période.
        </p>
      </LegalSection>

      <LegalSection title="2. Achat des abonnements">
        <p>
          Les paliers (Essentiel, Confort, Affluence) sont payés par mobile money, en FCFA, pour une
          période de 30 jours. Aucun prélèvement automatique n'existe : chaque renouvellement est un
          paiement volontaire.
        </p>
      </LegalSection>

      <LegalSection title="3. Cas de remboursement">
        <p>Un remboursement intégral est accordé dans les cas suivants :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            double paiement avéré pour la même période (erreur de transfert, nouvelle tentative
            après un délai de confirmation) ;
          </li>
          <li>
            défaillance durable du service après votre souscription (impossibilité d'utiliser la
            caisse pendant plusieurs jours, non résolue par notre service) ;
          </li>
          <li>
            demande dans les 14 jours suivant le paiement, si l'abonnement n'a pas été utilisé.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Cas non remboursés">
        <p>
          Aucun remboursement n'est accordé pour les périodes déjà consommées, les périmètres non
          utilisés (fonctionnalités offertes mais non employées), ou les erreurs imputables à
          l'utilisateur (coordonnées de paiement incorrectes, numéro erroné).
        </p>
      </LegalSection>

      <LegalSection title="5. Procédure">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            contactez-nous via WhatsApp en indiquant le nom de la boutique et la référence du
            paiement ;
          </li>
          <li>nous vérifions la transaction auprès de l'opérateur mobile money ;</li>
          <li>le remboursement est effectué sur le même numéro, sous 7 jours ouvrés.</li>
        </ol>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          Toute question relative à un remboursement doit passer par notre canal WhatsApp, qui
          constitue la seule voie de traitement des demandes.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPage>
  );
}
