// Mise en page commune aux pages légales (politique de confidentialité, conditions
// d'utilisation, remboursements). Pages PUBLIQUES hors de la route de mise en page
// `_app` : aucun chrome applicatif, aucune donnée métier — même modèle que index.tsx
// (document unique prérendu, puis affiché quelle que soit l'URL).
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";

export const LEGAL_CONTACT_WHATSAPP = "https://wa.me/241076505254";
export const LEGAL_COMPANY = "ELYNDRA TECH Gabon";
export const LEGAL_APP = "ELYNDRA CAISSE";

export function LegalContact() {
  return (
    <p className="text-xs text-muted-foreground">
      Contact :{" "}
      <a
        href={LEGAL_CONTACT_WHATSAPP}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        WhatsApp ELYNDRA CAISSE
      </a>
    </p>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <ScrollText className="h-4 w-4 text-primary" />
            {LEGAL_APP}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 lg:px-8">
        <div className="rounded-[1.75rem] border bg-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">Dernière mise à jour : {lastUpdated}</p>
          <div className="mt-6 space-y-6 text-sm leading-relaxed">{children}</div>
        </div>
      </main>
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6 text-xs text-muted-foreground lg:px-8">
          © {new Date().getFullYear()} {LEGAL_COMPANY} — {LEGAL_APP}. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
