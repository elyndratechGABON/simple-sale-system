// Mise en page de l'APPLICATION : en-tête de navigation, zone de contenu animée et
// assistant de premier lancement. Route sans segment d'URL (`_app`), donc `/pos` reste
// `/pos`.
//
// POURQUOI CE CHROME N'EST PAS DANS `__root.tsx` — et ne doit pas y retourner.
//
// Le build statique ne prérend qu'UN document (`dist/client/index.html`), obtenu en
// rendant l'application à la racine `/`. Ce document est ensuite servi pour toutes les
// URL (rewrite Vercel) et hydraté par React. Tout ce que la racine rend se retrouve donc
// FIGÉ dans cette coquille : si l'en-tête y était et qu'il dépendait du chemin, la
// coquille prérendue sur `/` — la page de présentation, qui n'a pas d'en-tête applicatif —
// n'aurait pas d'en-tête, et l'hydratation de `/pos` ou `/reports` échouerait
// (« Hydration failed », React jette le HTML serveur et refait tout côté client).
//
// Le contenu des routes, lui, est rendu APRÈS l'hydratation de la coquille : il peut
// différer sans rien casser. Placer ici le chrome propre à l'application, et laisser
// `__root.tsx` ne contenir que ce qui est vrai pour TOUTES les pages, résout le problème
// par construction — plus aucune condition sur le chemin nulle part.
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { Header } from "../components/Header";
import { BottomNav } from "../components/Nav";
import { Onboarding } from "../components/Onboarding";
import { RenewalBanner } from "../components/RenewalBanner";
import { SuspendedScreen } from "../components/SuspendedScreen";
import { GatekeeperAlerts } from "../components/GatekeeperAlerts";
import { ensureShopProfile } from "../lib/db";
import { getPreferences } from "../lib/settings";
import { backgroundSync } from "../lib/sync";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  // Monté uniquement dans l'application (jamais sur la page publique `/`) : c'est le
  // premier accès du commerçant. La fiche boutique se crée d'elle-même — nom repris de
  // l'espace de travail — puis `backgroundSync` la pousse à l'orchestrateur aussitôt,
  // au retour en ligne et toutes les minutes. Aucune démarche d'inscription à faire.
  useEffect(() => {
    void ensureShopProfile(getPreferences().workspaceName).then(() => backgroundSync());
  }, []);

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Header />
        <RenewalBanner />
        {/* `pb-24` réserve la hauteur de la barre d'onglets basse, qui est en `fixed` et
            ne pousse donc rien : sans cette réserve elle recouvre la fin de chaque page —
            le bouton « Valider la vente », le dernier produit, le dernier réglage. */}
        <main className="flex-1 pb-24 lg:pb-0">
          <RouteTransition />
        </main>
      </div>
      <BottomNav />
      <Onboarding />
      <GatekeeperAlerts />
      <SuspendedScreen />
    </>
  );
}

/**
 * Fondu-glissé entre les routes.
 *
 * `mode="wait"` : sans lui les deux écrans se superposeraient une fraction de seconde,
 * et sur la caisse cela ferait clignoter le total. `initial={false}` : le premier rendu
 * ne s'anime pas — animer l'arrivée sur la page ferait perdre au démarrage le temps que
 * le rendu serveur vient de gagner.
 */
function RouteTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
