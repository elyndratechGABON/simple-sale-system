// Comptabilité — shell d'assemblage.
//
// Ce fichier ne fait QUE composer. Tout ce qui est affichable vit dans
// `src/components/reports/`, les calculs de période dans `src/lib/reports/period.ts`.
// Il faisait 1030 lignes avec neuf composants imbriqués : aucun n'était testable et
// le calendrier ne pouvait pas évoluer sans toucher la page entière.
//
// L'URL reste `/reports` (renommer casserait les liens, le BottomNav et `useAccess`) ;
// seul le libellé a changé. Voir PRD v2.0 §5.4.

import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/reports/ReportsPage";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [{ title: "Comptabilité — ELYNDRA CAISSE" }],
  }),
  component: ReportsPage,
});
