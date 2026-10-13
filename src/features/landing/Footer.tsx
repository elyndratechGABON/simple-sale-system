import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo-header.png" alt="" className="h-12 w-12 object-contain" />
          <div>
            <p className="font-bold">ELYNDRA CAISSE</p>
            <p className="text-sm text-muted-foreground">
              La gestion de votre business, simplement.
            </p>
          </div>
        </div>
        <nav aria-label="Liens du site" className="flex flex-col gap-y-2 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a
              href="#fonctionnalites"
              className="inline-flex min-h-[32px] items-center text-muted-foreground hover:text-primary"
            >
              Fonctionnalités
            </a>
            <a
              href="#tarifs"
              className="inline-flex min-h-[32px] items-center text-muted-foreground hover:text-primary"
            >
              Tarifs
            </a>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <Link
              to="/legal/privacy"
              className="inline-flex min-h-[28px] items-center text-muted-foreground hover:text-primary"
            >
              Confidentialité
            </Link>
            <Link
              to="/legal/terms"
              className="inline-flex min-h-[28px] items-center text-muted-foreground hover:text-primary"
            >
              Conditions
            </Link>
            <Link
              to="/legal/refund"
              className="inline-flex min-h-[28px] items-center text-muted-foreground hover:text-primary"
            >
              Remboursements
            </Link>
          </div>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ELYNDRA TECH Gabon
        </p>
      </div>
    </footer>
  );
}
