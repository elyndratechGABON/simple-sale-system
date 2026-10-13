// Paramètres — point unique de modification de tout ce que l'onboarding a demandé,
// plus le PIN et la sauvegarde/restauration.
//
// Le dossier de documents et le PIN vivaient auparavant dans /reports. Ils ont migré
// ici : /reports est une page d'analyse, elle n'avait pas à porter de la configuration.
import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — ELYNDRA CAISSE" },
      {
        name: "description",
        content:
          "Nom du commerce, couleur de l'application, dossier des documents, code PIN, sauvegarde et restauration.",
      },
    ],
  }),
  component: SettingsPage,
});
