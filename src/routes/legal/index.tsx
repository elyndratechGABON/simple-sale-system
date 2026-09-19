// Index des pages légales — /legal. Répertoire des documents (confidentialité,
// conditions, remboursements) pour le visiteur qui tombe directement sur l'URL.
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, FileText, Scale, Undo2 } from "lucide-react";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Documents légaux — ELYNDRA CAISSE" },
      {
        name: "description",
        content:
          "Politique de confidentialité, conditions d'utilisation et politique de remboursement d'ELYNDRA CAISSE.",
      },
    ],
  }),
  component: LegalIndexPage,
});

function LegalCard({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof FileText;
  title: string;
  body: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-[1.5rem] border bg-card p-5 transition-shadow hover:shadow-[0_24px_70px_-28px_rgba(4,41,30,0.35)]"
    >
      <span className="inline-flex shrink-0 rounded-xl bg-primary p-3 text-primary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          {title}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{body}</span>
      </span>
    </Link>
  );
}

function LegalIndexPage() {
  return (
    <LegalPage title="Documents légaux" lastUpdated="septembre 2026">
      <p className="text-muted-foreground">
        Retrouvez ici les documents officiels d'ELYNDRA CAISSE. Ils décrivent comment vos données
        sont traitées, ce que vous acceptez en utilisant l'application, et vos droits en matière de
        remboursement.
      </p>
      <div className="grid gap-4 sm:grid-cols-1">
        <LegalCard
          to="/legal/privacy"
          icon={FileText}
          title="Politique de confidentialité"
          body="Quelles données sont collectées, pourquoi, comment elles sont protégées et vos droits."
        />
        <LegalCard
          to="/legal/terms"
          icon={Scale}
          title="Conditions d'utilisation"
          body="Compte, abonnement, suspension, responsabilités et obligations des utilisateurs."
        />
        <LegalCard
          to="/legal/refund"
          icon={Undo2}
          title="Politique de remboursement"
          body="Les cas de remboursement des abonnements payés par mobile money et la procédure à suivre."
        />
      </div>
    </LegalPage>
  );
}
