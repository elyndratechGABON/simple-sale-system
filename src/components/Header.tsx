import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { getMonthlyOverview, getSetting } from "@/lib/db";
import { currentMonthKey } from "@/lib/profit";
import { TopNav } from "@/components/Nav";
import { ProfitSheet } from "@/components/ProfitSheet";
import { SubscriptionsDialog } from "@/components/SubscriptionsDialog";
import { NotificationBell } from "@/components/NotificationBell";
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
  const [profitOpen, setProfitOpen] = useState(false);
  const clicks = useRef(0);
  const lastClick = useRef(0);

  // Logo posé par le commerçant (Paramètres › Logo), sinon l'icône de l'application.
  const { data: shopLogo } = useQuery({
    queryKey: ["shop_logo"],
    queryFn: () => getSetting<string>("shop_logo") ?? null,
    staleTime: 60_000,
  });

  // Pastille du mois : tant que le mois courant n'a ni charges ni complément renseignés,
  // le calculateur mérite un coup d'œil. Même clé de cache que ProfitSheet — l'invalidation
  // après « Calculer mon bénéfice » retire la pastille sans recharger la page.
  const monthKey = currentMonthKey();
  const { data: monthOverview } = useQuery({
    queryKey: ["monthly_overview", monthKey],
    queryFn: () => getMonthlyOverview(monthKey),
    staleTime: 30_000,
  });
  const needsCycle =
    (monthOverview?.charges ?? 0) === 0 && (monthOverview?.cost_complement ?? 0) === 0;

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
    // Header compact et sûr à la fois : hauteur minimale 64px sur téléphone
    // (`--header-h`), logo borné (jamais plus grand que la barre qui le porte)
    // et nom du commerce TRONQUÉ au lieu de pousser la cloche et l'avatar hors
    // écran — c'était le débordement horizontal d'origine (logo 80px).
    <header className="sticky top-0 z-20 border-b bg-card/85 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/75 pt-[env(safe-area-inset-top)]">
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
            />
          </span>
          <span className="truncate text-foreground">{workspaceName}</span>
        </Link>
        {/* Sous `lg`, la navigation vit dans `BottomNav` — cf. src/components/Nav.tsx. */}
        <div className="flex shrink-0 items-center gap-1">
          <TopNav />
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="CA du mois et bénéfices"
            title="CA du mois et bénéfices"
            onClick={() => setProfitOpen(true)}
          >
            <Calculator className="h-5 w-5" />
            {needsCycle && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background"
                aria-hidden
              />
            )}
          </Button>
          <NotificationBell />
          {role === "owner" && (
            <Link
              to="/settings"
              aria-label="Profil et réglages"
              className="ml-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 sm:h-9 sm:w-9"
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
      <ProfitSheet open={profitOpen} onOpenChange={setProfitOpen} />
    </header>
  );
}
