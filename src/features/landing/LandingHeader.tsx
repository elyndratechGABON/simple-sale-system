import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { InstallCta } from "./InstallCta";

// ============================================================================
// En-tête : marque + ancres de section, CTA d'installation à droite
// ============================================================================

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-card/85 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo-header.png" alt="ELYNDRA CAISSE" className="h-14 w-14 object-contain" />
          <span>
            <span className="block text-base font-bold leading-tight">ELYNDRA CAISSE</span>
            <span className="block text-[11px] font-semibold tracking-wide text-primary/80">
              ELYNDRA TECH GABON
            </span>
          </span>
        </Link>
        <nav aria-label="Sections de la page" className="hidden items-center gap-7 lg:flex">
          <AnchorLink href="#fonctionnalites">Fonctionnalités</AnchorLink>
          <AnchorLink href="#tarifs">Tarifs</AnchorLink>
        </nav>
        <div className="hidden sm:block">
          <InstallCta compact />
        </div>
      </div>
    </header>
  );
}

function AnchorLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-[32px] items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
    </a>
  );
}
