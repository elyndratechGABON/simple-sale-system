import { Link } from "@tanstack/react-router";
import {
  ShoppingCart,
  Package,
  History,
  BarChart3,
  Wallet,
  Settings as SettingsIcon,
} from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";

const links = [
  { to: "/pos", label: "Caisse", icon: ShoppingCart },
  { to: "/stocks", label: "Stocks", icon: Package },
  { to: "/expenses", label: "Dépenses", icon: Wallet },
  { to: "/history", label: "Historique", icon: History },
  { to: "/reports", label: "Rapports", icon: BarChart3 },
  { to: "/settings", label: "Réglages", icon: SettingsIcon },
] as const;

export function Header() {
  const { workspaceName } = usePreferences();

  return (
    <header className="border-b bg-card sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/pos" className="flex items-center gap-2 font-bold text-lg min-w-0">
          <span className="rounded-md bg-primary px-2 py-1 text-primary-foreground shrink-0">
            POS
          </span>
          {/* Masqué sous `sm` : à six entrées de navigation, le nom du commerce et les
              icônes ne tiennent plus ensemble sur un écran de téléphone. */}
          <span className="hidden sm:inline truncate text-foreground">{workspaceName}</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                title={l.label}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                activeProps={{
                  className:
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground",
                }}
              >
                <Icon className="h-4 w-4" />
                {/* `lg` et non `sm` : six libellés visibles feraient déborder la barre
                    sur une tablette en portrait. L'icône seule reste, avec son `title`. */}
                <span className="hidden lg:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
