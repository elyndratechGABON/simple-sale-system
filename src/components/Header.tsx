import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { usePreferences } from "@/hooks/use-preferences";
import { TopNav } from "@/components/Nav";
import { SubscriptionsDialog } from "@/components/SubscriptionsDialog";

// Accès caché à la gestion des abonnements : 5 appuis sur le logo « POS ».
// Le compteur se remet à zéro si deux appuis sont espacés de plus de deux secondes, pour
// qu'un appui ici et là pendant la journée n'ouvre rien par mégarde.
const HIDDEN_ACCESS_CLICKS = 5;
const HIDDEN_ACCESS_WINDOW_MS = 2000;

export function Header() {
  const { workspaceName } = usePreferences();
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(false);
  const clicks = useRef(0);
  const lastClick = useRef(0);

  function onLogoClick() {
    const now = Date.now();
    if (now - lastClick.current > HIDDEN_ACCESS_WINDOW_MS) clicks.current = 0;
    lastClick.current = now;
    clicks.current += 1;
    if (clicks.current >= HIDDEN_ACCESS_CLICKS) {
      clicks.current = 0;
      setSubscriptionsOpen(true);
    }
  }

  return (
    <header className="border-b bg-card sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/pos"
          className="flex items-center gap-2 font-bold text-lg min-w-0"
          onClick={onLogoClick}
        >
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
      <SubscriptionsDialog open={subscriptionsOpen} onOpenChange={setSubscriptionsOpen} />
    </header>
  );
}
