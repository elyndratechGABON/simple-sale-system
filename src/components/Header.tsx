import { Link } from "@tanstack/react-router";
import { usePreferences } from "@/hooks/use-preferences";
import { TopNav } from "@/components/Nav";

export function Header() {
  const { workspaceName } = usePreferences();

  return (
    <header className="border-b bg-card sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/pos" className="flex items-center gap-2 font-bold text-lg min-w-0">
          <span className="rounded-md bg-primary px-2 py-1 text-primary-foreground shrink-0">
            POS
          </span>
          {/* Le nom du commerce tient désormais sur téléphone : la navigation est partie
              en bas, l'en-tête n'a plus qu'à porter la marque. */}
          <span className="truncate text-foreground">{workspaceName}</span>
        </Link>
        {/* Sous `lg`, la navigation vit dans `BottomNav` — cf. src/components/Nav.tsx. */}
        <TopNav />
      </div>
    </header>
  );
}
