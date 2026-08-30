// Navigation de l'application, en DEUX rendus pour un seul jeu de destinations.
//
// Mobile — dock d'onglets flottant en bas. C'est le seul endroit qu'un pouce atteint
// sans changer de prise sur le téléphone, et la caisse se tient à une main pendant
// qu'on sert. L'ancienne barre haute réduisait les cinq entrées à des icônes de
// 40×32 px, sous le minimum de 44 px recommandé et sans libellé : on ne pouvait ni
// viser ni deviner. La pleine largeur (grille à 5 colonnes) a elle été essayée et
// abandonnée pour la même raison qui a donné le dock : un dock rétréci à `max-w-lg`
// laissait un angle mort inatteignable aux coins de l'écran sur les grands
// smartphones. Le dock est donc pleine largeur moins une fine gouttière (`px-3`),
// les coins deviennent un arrondi visible au lieu d'une zone hors de portée.
//
// Bureau (`lg`) — la barre haute reprend sa place, où la largeur permet les libellés
// et où le pointeur n'a pas de zone hors de portée.
import { Link } from "@tanstack/react-router";
import { Home, ShoppingCart, Package, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

export const NAV_LINKS = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/pos", label: "Caisse", icon: ShoppingCart },
  { to: "/stocks", label: "Stocks", icon: Package },
  { to: "/reports", label: "Rapports", icon: BarChart3 },
  { to: "/settings", label: "Réglages", icon: SettingsIcon },
] as const;

/** Barre haute, à partir de `lg` seulement. L'onglet actif devient une pilule
 *  de la couleur de marque, lisible d'un coup d'œil contre le reste. */
export function TopNav() {
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {NAV_LINKS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          activeProps={{
            className:
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground shadow-sm",
          }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Dock d'onglets flottant, jusqu'à `lg`.
 *
 * Chaque onglet est une pilule de 44 px de haut minimum (la cible tactile
 * recommandée), l'actif en pleine teinte de marque pour se détacher du dock.
 *
 * La hauteur qu'occupe le dock est portée en deux jetons :
 *  - `--bottomnav-h` (styles.css) : dock + gouttière de flottement (4rem). La
 *    réserve de padding du contenu principal (`app-main`) et le décalage de la
 *    barre de résumé de la caisse en dérivent ; changer la hauteur ici les met
 *    à jour.
 *  - `env(safe-area-inset-bottom)` : remonte le dock au-dessus de l'indicateur
 *    d'accueil des iPhone sans encoche matérielle sans le coller au bord.
 *
 * Clavier ouvert : le layout viewport ne rétrécissant pas, le dock resterait
 * DERRIÈRE les touches. `useKeyboardHeight()` mesure celui-ci via
 * `visualViewport` et translate le dock par `bottom:` exactement sa hauteur — les
 * onglets restent sous le pouce pendant qu'on tape (recherche, prix libre…).
 */
export function BottomNav() {
  const { keyboardHeight } = useKeyboardHeight();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] lg:hidden"
      style={{ bottom: keyboardHeight }}
      aria-label="Navigation principale"
    >
      <div className="flex items-stretch gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)] backdrop-blur">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-muted-foreground transition-colors active:bg-accent/70"
            activeProps={{
              className:
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 bg-primary text-primary-foreground shadow-[0_4px_12px_-6px_rgb(0_0_0/0.5)]",
            }}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2.25} />
            <span className="w-full truncate text-center text-[11px] font-semibold leading-none">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
