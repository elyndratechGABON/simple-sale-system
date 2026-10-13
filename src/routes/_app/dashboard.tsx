// Page d'accueil — pilotage de l'activité.
//
// Salutation, KPIs du jour TOUJOURS visibles (zéro vente est une information, pas une
// absence d'écran), actions rapides adaptées au cluster métier, alertes contextuelles
// du moteur PUR src/lib/alerts.ts, performance de la semaine comparée à la précédente,
// top produits et activité récente. Une seule requête de 14 jours alimente semaine
// courante ET précédente — deux requêtes séparées liraient deux instants différents.
import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Accueil — ELYNDRA CAISSE" }],
  }),
  component: DashboardPage,
});
