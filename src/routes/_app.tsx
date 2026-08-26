// Mise en page de l'APPLICATION (post-onboarding) : en-tête de navigation et zone
// de contenu animée. Route sans segment d'URL (`_app`), donc `/pos` reste `/pos`.
// L'onboarding vit DANS SA PROPRE ROUTE /welcome : le beforeLoad ci-dessous y
// renvoie quiconque n'a pas terminé son installation, avant tout rendu.
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
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Header } from "../components/Header";
import { BottomNav } from "../components/Nav";
import { LoadingScreen } from "../components/LoadingScreen";
import { RenewalBanner } from "../components/RenewalBanner";
import { SuspendedScreen } from "../components/SuspendedScreen";
import { GatekeeperAlerts } from "../components/GatekeeperAlerts";
import { ensureShopProfile } from "../lib/db";
import { getPreferences } from "../lib/settings";
import { backgroundSync } from "../lib/sync";

export const Route = createFileRoute("/_app")({
  // GARDE ANTI-FLASH : couru AVANT le montage du moindre composant applicatif.
  // Tant que l'onboarding n'est pas terminé, ni ce layout ni ses enfants
  // (caisse, stocks, rapports…) ne sont instanciés : le navigateur part direct
  // vers /welcome. Aucune donnée métier, aucun chrome, aucun flash possible —
  // c'est la garantie structurelle, pas un overlay posé sur l'app.
  beforeLoad: () => {
    const prefs = getPreferences();
    if (!prefs.onboarded || !prefs.onboardingCompleted) {
      throw redirect({ to: "/welcome" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const [loading, setLoading] = useState(true);
  // Progression RÉELLE du démarrage, passée à l'écran de chargement : chaque jalon
  // franchi pousse le compteur (jamais en arrière — `Math.max`, l'ordre d'arrivée
  // des promesses n'est pas garanti).
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const bump = (v: number) => setProgress((p) => Math.max(p, v));
    // Plancher court (400 ms) : juste le temps que l'écran ne clignote pas quand
    // tout est déjà prêt. Le compteur étant sincère, plus besoin de délai-théâtre.
    const minDelay = new Promise((r) => setTimeout(r, 400)).then(() => bump(90));
    // La synchronisation réseau NE BLOQUE PLUS l'affichage : l'app est offline-first,
    // rien dans /pos n'en dépend. Elle part en tâche de fond dès que le profil existe.
    const profileReady = ensureShopProfile(getPreferences().workspaceName).then(() => bump(75));
    void Promise.all([minDelay, profileReady]).then(async () => {
      bump(100);
      // Laisse le compteur afficher 100 % un instant avant la bascule vers l'app.
      await new Promise((r) => setTimeout(r, 250));
      setLoading(false);
    });
    void profileReady.then(() => backgroundSync());
  }, []);

  if (loading) return <LoadingScreen progress={progress} />;

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Header />
        <RenewalBanner />
        {/* `.app-main` (styles.css) réserve exactement `--bottomnav-h` + marge système :
            la barre d'onglets est en `fixed` sous `lg` et ne pousse rien — sans cette
            réserve elle recouvrirait la fin de chaque page (le bouton « Valider la
            vente », le dernier produit, le dernier réglage). À partir de `lg`, la barre
            disparaît et la réserve avec elle. */}
        <main className="app-main flex-1">
          <RouteTransition />
        </main>
      </div>
      <BottomNav />
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
