// Politique de confidentialité — page publique /legal/privacy.
//
// Le contenu reflète le fonctionnement RÉEL de l'application : offline-first,
// synchronisation d'agrégats (7 jours) + opérations de convergence via le canal
// ops, zéro tracker tiers, paiement mobile money confirmé par message de référence.
import { createFileRoute } from "@tanstack/react-router";
import {
  LEGAL_APP,
  LEGAL_COMPANY,
  LegalContact,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — ELYNDRA CAISSE" },
      {
        name: "description",
        content:
          "Comment ELYNDRA CAISSE collecte, utilise et protège vos données — caisse offline-first, aucun tracking tiers.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" lastUpdated="septembre 2026">
      <LegalSection title="1. Qui édite l'application ?">
        <p>
          {LEGAL_APP} est éditée par {LEGAL_COMPANY}. La présente politique vous informe de la
          manière dont vos données personnelles sont traitées lorsque vous utilisez l'application.
        </p>
        <p>
          En cas de question, contactez-nous via notre{" "}
          <a
            href="https://wa.me/241076505254"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            canal WhatsApp
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <p>Nous traitons uniquement les données nécessaires au fonctionnement du service :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Données d'inscription</strong> : nom de la boutique,
            type de commerce, numéro de téléphone et mot de passe du compte (ou mot clé de
            récupération).
          </li>
          <li>
            <strong className="text-foreground">Données d'activité</strong> : produits, prix, coûts,
            stocks, ventes, clients et historique, que vous saisissez dans l'application.
          </li>
          <li>
            <strong className="text-foreground">Données techniques</strong> : identifiant d'appareil
            (empreinte) permettant de rattacher chaque caisse à un compte.
          </li>
        </ul>
        <p>
          Nous ne collectons <strong className="text-foreground">aucune</strong> donnée de
          localisation, aucune donnée de navigation, aucune donnée publicitaire.
        </p>
      </LegalSection>

      <LegalSection title="3. Finalités et base légale">
        <p>Vos données sont traitées pour :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            vous fournir la caisse, les stocks, les rapports et l'historique (exécution du contrat)
            ;
          </li>
          <li>synchroniser plusieurs caisses d'un même compte (exécution du contrat) ;</li>
          <li>gérer votre abonnement et son paiement par mobile money (exécution du contrat) ;</li>
          <li>vous assister via le service client (intérêt légitime).</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Stockage et synchronisation">
        <p>
          L'application est pensée <strong className="text-foreground">offline-first</strong> : vos
          données vivent d'abord sur votre appareil (base locale IndexedDB). Elles sont ensuite
          synchronisées vers notre serveur d'orchestration, en HTTPS, uniquement pour faire
          communiquer vos caisses entre elles :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            des agrégats légers de vos 7 derniers jours d'activité (chiffre d'affaires, marges,
            meilleures journées), jamais vos lignes de vente brutes ;
          </li>
          <li>
            des opérations de convergence (produits, ventes, stock) nécessaires au fonctionnement
            multi-appareils, via un relais technique qui les stocke telles quelles sans les
            exploiter.
          </li>
        </ul>
        <p>
          Vos données ne sont <strong className="text-foreground">jamais</strong> vendues, louées ou
          partagées à des tiers à des fins commerciales ou publicitaires.
        </p>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez les effacer à
          tout moment depuis l'application : <em>Paramètres → Supprimer la boutique</em>. La
          suppression efface les données locales de l'appareil et la fiche du compte chez
          l'orchestrateur.
        </p>
      </LegalSection>

      <LegalSection title="6. Vos droits">
        <p>
          Conformément à la réglementation applicable sur la protection des données, vous disposez
          des droits :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>d'accès à vos données ;</li>
          <li>de rectification (modifier vos informations dans les Paramètres) ;</li>
          <li>
            d'effacement (<em>Paramètres → Supprimer la boutique</em>, ou demande auprès du service
            client) ;
          </li>
          <li>de portabilité (l'export de sauvegarde JSON depuis les Paramètres) ;</li>
          <li>d'opposition au traitement de vos données à des fins d'amélioration du service.</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez le service client via WhatsApp. Nous répondons sous 30
          jours.
        </p>
      </LegalSection>

      <LegalSection title="7. Protection des mineurs">
        <p>
          L'application est destinée aux professionnels et n'est pas conçue pour les enfants. Nous
          ne collectons pas sciemment de données d'enfants de moins de 13 ans.
        </p>
      </LegalSection>

      <LegalSection title="8. Sécurité">
        <p>
          Les échanges avec nos serveurs sont chiffrés en HTTPS. Sur votre appareil, les données
          restent dans le stockage local sécurisé du navigateur. Nous appliquons les règles de l'art
          en matière de redondance et de sauvegarde de nos serveurs.
        </p>
      </LegalSection>

      <LegalSection title="9. Modifications">
        <p>
          Cette politique peut être mise à jour. La version applicable est celle disponible dans
          l'application ; la date de mise à jour figure en haut de cette page.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPage>
  );
}
