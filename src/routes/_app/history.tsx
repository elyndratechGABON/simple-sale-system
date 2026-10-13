import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/features/history/HistoryPage";

export const Route = createFileRoute("/_app/history")({
  head: () => ({
    meta: [
      { title: "Historique des ventes — ELYNDRA CAISSE" },
      {
        name: "description",
        content: "Toutes les ventes enregistrées, groupées par jour, avec annulation.",
      },
    ],
  }),
  component: HistoryPage,
});
