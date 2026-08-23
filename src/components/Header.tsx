import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { usePreferences } from "@/hooks/use-preferences";
import { getSetting } from "@/lib/db";
import { TopNav } from "@/components/Nav";
import { SubscriptionsDialog } from "@/components/SubscriptionsDialog";
import { NotificationBell } from "@/components/NotificationBell";

/** Initiales pour l'avatar sans photo : deux lettres maximum, du nom fourni. */
function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

// Accès caché à la gestion des abonnements : 5 appuis sur le logo « ECAISSE ».
// Le compteur se remet à zéro si deux appuis sont espacés de plus de deux secondes, pour
// qu'un appui ici et là pendant la journée n'ouvre rien par mégarde.
const HIDDEN_ACCESS_CLICKS = 5;
const HIDDEN_ACCESS_WINDOW_MS = 2000;

export function Header() {
  const { workspaceName, ownerName, ownerPhoto } = usePreferences();
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(false);
  const clicks = useRef(0);
  const lastClick = useRef(0);

  // Logo posé par le commerçant (Paramètres › Logo), sinon l'icône de l'application.
  const { data: shopLogo } = useQuery({
    queryKey: ["shop_logo"],
    queryFn: () => getSetting<string>("shop_logo"),
    staleTime: 60_000,
  });

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
    <header className="sticky top-0 z-20 border-b bg-card/85 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/75 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/pos"
          className="inline-flex items-center gap-3 font-bold text-lg min-w-0"
          onClick={onLogoClick}
        >
          <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center">
            <img
              src={shopLogo || "/logo-header.png"}
              alt={workspaceName || "ECAISSE"}
              className="h-full w-full object-contain"
            />
          </span>
          <span className="truncate text-foreground">{workspaceName}</span>
        </Link>
        {/* Sous `lg`, la navigation vit dans `BottomNav` — cf. src/components/Nav.tsx. */}
        <div className="flex items-center gap-1">
          <TopNav />
          <NotificationBell />
          <Link
            to="/settings"
            aria-label="Profil et réglages"
            className="ml-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            {ownerPhoto ? (
              <img src={ownerPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(ownerName || workspaceName)
            )}
          </Link>
        </div>
      </div>
      <SubscriptionsDialog open={subscriptionsOpen} onOpenChange={setSubscriptionsOpen} />
    </header>
  );
}
