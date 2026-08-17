// Navigation de l'application, en DEUX rendus pour un seul jeu de destinations.
//
// Mobile — barre d'onglets en bas. C'est le seul endroit qu'un pouce atteint sans
// changer de prise sur le téléphone, et la caisse se tient à une main pendant qu'on sert.
// L'ancienne barre haute réduisait les cinq entrées à des icônes de 40×32 px, sous le
// minimum de 44 px recommandé et sans libellé : on ne pouvait ni viser ni deviner.
//
// Bureau (`lg`) — la barre haute reprend sa place, où la largeur permet les libellés et
// où le pointeur n'a pas de zone hors de portée.
import { Link } from "@tanstack/react-router";
import { Home, ShoppingCart, Package, BarChart3, Settings as SettingsIcon } from "lucide-react";

export const NAV_LINKS = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/pos", label: "Caisse", icon: ShoppingCart },
  { to: "/stocks", label: "Stocks", icon: Package },
  { to: "/reports", label: "Rapports", icon: BarChart3 },
  { to: "/settings", label: "Réglages", icon: SettingsIcon },
] as const;

/** Barre haute, à partir de `lg` seulement. */
export function TopNav() {
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {NAV_LINKS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          activeProps={{
            className:
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground",
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
 * Barre d'onglets basse, jusqu'à `lg`.
 *
 * Cinq onglets sur 390 px font 78 px chacun : au-dessus des 44 px minimum, et le libellé
 * tient sous l'icône.
 *
 * `pb-[env(safe-area-inset-bottom)]` remonte la barre au-dessus de l'indicateur d'accueil
 * des iPhone sans encoche matérielle — sans lui, le dernier onglet est à moitié couvert.
 */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center text-[10px] leading-none">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
