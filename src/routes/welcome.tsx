// ROUTE D'ENTRÉE INDÉPENDANTE — /welcome
//
// L'onboarding n'est PAS une modale posée sur l'application : c'est une page
// à part entière, hors du layout `_app`. Tant que l'utilisateur n'a pas terminé
// son installation (onboarded + onboardingCompleted), la route `/_app` le
// renvoie ici AVANT de monter le moindre composant applicatif (cf. beforeLoad
// de _app.tsx) — donc aucune caisse, aucun stock, aucune donnée métier derrière.
//
// Machine à états du parcours :
//   WELCOME (mascotte + trois cartes : Créer un compte / Se connecter / Mon expérience)
//     → WIZARD (SetupWizard : confidentialité, enseigne, compte, secteur…)
//       → TUTORIAL (ClusterTutorial : premiers produits ou démo)
//         → /pos (l'application, désormais autorisée par _app)
//
// Design : fond crème de la marque, halos verts très subtils, carte centrale ;
// mobile = vraie page 100vw × 100dvh avec safe-area insets respectés.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { WelcomePage } from "@/features/welcome/WelcomePage";
import { getPreferences } from "@/lib/settings";

export const Route = createFileRoute("/welcome")({
  // Utilisateur déjà installé → straight to the till : rafraîchissement,
  // réouverture du navigateur, deep-link… rien ne repasse par l'onboarding.
  beforeLoad: () => {
    const prefs = getPreferences();
    if (prefs.onboarded && prefs.onboardingCompleted) {
      throw redirect({ to: "/pos" });
    }
  },
  component: WelcomePage,
});
