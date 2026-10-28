import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon, Users } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { getSetting } from "@/lib/db";
import { TopNav } from "@/components/Nav";
import { SubscriptionsDialog } from "@/components/SubscriptionsDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { TeamDialog } from "@/components/TeamDialog";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/hooks/use-access";

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
  const { role } = useAccess();
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }
  const [teamOpen, setTeamOpen] = useState(false);
  const clicks = useRef(0);
  const lastClick = useRef(0);

  // Logo posé par le commerçant (Paramètres › Logo), sinon l'icône de l'application.
  // `await` AVANT le `??` : sans lui, le repli s'applique à la Promise et la requête
  // résout vers `undefined` (cf. ERR-QUERY-001).
  const { data: shopLogo } = useQuery({
    queryKey: ["shop_logo"],
    queryFn: async () => (await getSetting<string>("shop_logo")) ?? null,
    staleTime: 60_000,
  });

  // Icône Équipe et Activité : visibles pour le propriétaire uniquement.
  const isOwner = role === "owner";

  function onLogoClick() {
    if (role !== "owner") return;
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
    // Header compact et sûr : hauteur minimale 64px sur téléphone
    // (`--header-h`), logo borné, nom du commerce TRONQUÉ.
    <header className="sticky top-0 z-20 bg-background/95 pt-[env(safe-area-inset-top)]">
      <div className="app-container flex min-h-[var(--header-h)] items-center justify-between gap-2 sm:gap-4 sm:py-2.5">
        <Link
          to="/pos"
          className="inline-flex min-w-0 items-center gap-2.5 text-base font-bold sm:gap-3 sm:text-lg"
          onClick={onLogoClick}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center xs:h-10 xs:w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12">
            <img
              src={shopLogo || "/logo-header.png"}
              alt={workspaceName || "ECAISSE"}
              className="h-full w-full object-contain"
              width={48}
              height={48}
            />
          </span>
          <span className="truncate text-foreground">{workspaceName}</span>
        </Link>
        {/* Sous `lg`, la navigation vit dans `BottomNav` — cf. src/components/Nav.tsx. */}
        <div className="flex shrink-0 items-center gap-1">
          <TopNav />
          {isOwner && <NotificationBell />}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Basculer le mode nuit"
            title={isDark ? "Passer au mode clair" : "Passer au mode nuit"}
            onClick={toggleDarkMode}
          >
            {isDark ? (
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Équipe"
              title="Équipe — employés et activité du personnel"
              onClick={() => setTeamOpen(true)}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </Button>
          )}
          {isOwner && (
            <Link
              to="/settings"
              aria-label="Profil et réglages"
              className="ml-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 sm:h-9 sm:w-9"
            >
              {ownerPhoto ? (
                <img src={ownerPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(ownerName || workspaceName)
              )}
            </Link>
          )}
        </div>
      </div>
      <SubscriptionsDialog open={subscriptionsOpen} onOpenChange={setSubscriptionsOpen} />
      <TeamDialog open={teamOpen} onOpenChange={setTeamOpen} />
    </header>
  );
}
