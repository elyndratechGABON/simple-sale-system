import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Header } from "../components/Header";
import { PwaInstall } from "../components/PwaInstall";
import { Onboarding } from "../components/Onboarding";
import { applyTheme, getPreferences } from "../lib/settings";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Caisse POS — Ventes, stocks et monnaie" },
      {
        name: "description",
        content:
          "Application de caisse simple et hors-ligne : gestion des stocks, prise de commande, calcul de la monnaie à rendre et historique des ventes.",
      },
      { property: "og:title", content: "Caisse POS — Ventes, stocks et monnaie" },
      {
        property: "og:description",
        content: "Prenez vos commandes, calculez la monnaie et suivez vos stocks en temps réel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#059669" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // La couleur choisie est réappliquée à chaque démarrage. Elle vit dans localStorage,
  // que le rendu serveur ne peut pas lire : le HTML part donc toujours avec le vert par
  // défaut de styles.css, et bascule ici. Un très bref éclat de vert est possible au
  // premier rendu chez un utilisateur ayant choisi une autre couleur — le prix à payer
  // pour ne pas injecter de script bloquant dans le <head>.
  useEffect(() => {
    applyTheme(getPreferences().hue);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* `reducedMotion="user"` respecte prefers-reduced-motion pour TOUTE l'application
          d'un seul endroit : les animations deviennent instantanées au lieu d'être
          simplement plus courtes. Sans ça, chaque composant animé devrait le gérer. */}
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <RouteTransition />
          </main>
        </div>
        <Onboarding />
        <PwaInstall />
        <Toaster richColors position="top-center" />
      </MotionConfig>
    </QueryClientProvider>
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
