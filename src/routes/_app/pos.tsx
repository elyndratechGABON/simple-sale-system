import { createFileRoute } from "@tanstack/react-router";
import { PosPage } from "@/features/pos/PosPage";

export const Route = createFileRoute("/_app/pos")({
  head: () => ({
    meta: [
      { title: "Caisse — Nouvelle commande" },
      {
        name: "description",
        content:
          "Prenez la commande, sélectionnez les articles et calculez la monnaie à rendre au client.",
      },
    ],
  }),
  component: PosPage,
});
