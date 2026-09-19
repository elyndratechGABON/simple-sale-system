// Conditions d'utilisation — page publique /legal/terms.
//
// Reflète le fonctionnement réel : paliers d'abonnement valables 30 jours,
// paiement mobile money confirmé par référence, verrou suspendu à expiration,
// suppression définitive via « Supprimer la boutique ».
import { createFileRoute } from "@tanstack/react-router";
import { LegalContact, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — ELYNDRA CAISSE" },
      {
        name: "description",
        content:
          "Les conditions d'utilisation d'ELYNDRA CAISSE : compte, abonnement par période, suspension et responsabilités.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation" lastUpdated="septembre 2026">
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions encadrent l'utilisation d'ELYNDRA CAISSE, application de caisse
          et de gestion de boutique éditée par ELYNDRA TECH Gabon. En créant un compte et en
          utilisant l'application, vous acceptez sans réserve ces conditions.
        </p>
      </LegalSection>

      <LegalSection title="2. Compte et accès">
        <p>Pour utiliser le service, vous créez un compte associé à une boutique :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            les identifiants (numéro de téléphone + mot de passe), ou le mot clé de récupération,
            permettent de rattacher plusieurs caisses à un même compte ;
          </li>
          <li>vous êtes responsable de la confidentialité de ces identifiants ;</li>
          <li>le nombre de caisses simultanées dépend du palier souscrit.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Abonnement et paiement">
        <ul className="list-disc space-y-1 pl-5">
          <li>un essai gratuit de 30 jours est proposé, sans carte bancaire ;</li>
          <li>
            trois paliers sont disponibles (Essentiel, Confort, Affluence), chacun couvrant une
            période de 30 jours, payables par mobile money ;
          </li>
          <li>le paiement est confirmé par un message de référence envoyé à notre service ;</li>
          <li>
            le renouvellement dépend du montant de la période suivante, payable de la même façon.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Suspension du service">
        <p>
          À l'expiration de la période couverte, la caisse est suspendue : l'accès aux ventes est
          bloqué tant que l'abonnement n'est pas relancé. Les données locales ne sont jamais
          supprimées lors d'une suspension.
        </p>
      </LegalSection>

      <LegalSection title="5. Données de la boutique">
        <p>
          Vous restez propriétaire de vos données (produits, prix, ventes, clients). ELYNDRA CAISSE
          ne les utilise que pour fournir le service, et ne les cède jamais à des tiers. Vous pouvez
          les exporter (sauvegarde JSON) et les effacer (Paramètres → Supprimer la boutique) à tout
          moment.
        </p>
      </LegalSection>

      <LegalSection title="6. Obligations de l'utilisateur">
        <ul className="list-disc space-y-1 pl-5">
          <li>fournir des informations exactes lors de la création du compte ;</li>
          <li>utiliser l'application uniquement pour une activité licite ;</li>
          <li>ne pas tenter d'accéder à un compte ou à des données d'un tiers.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Responsabilité">
        <p>
          L'application fonctionne sans internet ; la responsabilité d'ELYNDRA TECH ne saurait
          toutefois être engagée en cas de perte de données imputable à un effacement manuel, à une
          panne du stockage local, ou à un usage non conforme présentes conditions. Nous mettons en
          œuvre les moyens raisonnables pour maintenir le service, sans obligation de disponibilité
          continue.
        </p>
      </LegalSection>

      <LegalSection title="8. Résiliation">
        <p>
          Vous pouvez résilier à tout moment : la suppression de la boutique efface les données
          locales de l'appareil et la fiche du compte chez l'orchestrateur. Nous pouvons résilier le
          service en cas de violation manifeste des présentes conditions.
        </p>
      </LegalSection>

      <LegalSection title="9. Modifications">
        <p>
          Ces conditions peuvent être mises à jour. La version applicable est celle affichée dans
          l'application ; l'utilisation continue du service vaut acceptation de la version en
          vigueur.
        </p>
      </LegalSection>

      <LegalSection title="10. Loi applicable">
        <p>
          Les présentes conditions sont régies par le droit gabonais. À défaut de résolution
          amiable, tout litige relève des tribunaux compétents de la République gabonaise.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPage>
  );
}
