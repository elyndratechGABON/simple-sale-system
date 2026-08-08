// État d'installabilité de la PWA, partagé par la landing et les paramètres.
//
// Extrait de l'ancien composant PwaInstall, qui portait à la fois cette logique et un
// bouton flottant. Le bouton a disparu (il recouvrait « Valider la vente ») ; la logique,
// elle, sert désormais à deux appelants — d'où le hook.
//
// Rien n'est évalué pendant le rendu : `isIOS` et `isStandalone` lisent `navigator`, qui
// n'existe pas au rendu serveur. Les lire dans le corps du composant produirait un HTML
// serveur différent du premier rendu client, donc une erreur d'hydratation.
import { useCallback, useEffect, useState } from "react";
import { type BeforeInstallPromptEvent, isIOS, isStandalone } from "@/lib/pwa";

/** Résultat d'une tentative d'installation. `ios-help` = à l'appelant d'afficher la marche à suivre. */
export type InstallOutcome = "accepted" | "dismissed" | "ios-help" | "unavailable";

export interface PwaInstallState {
  /** Un chemin d'installation existe sur cette plateforme. */
  canInstall: boolean;
  /** L'application tourne déjà installée, ou vient de l'être. */
  installed: boolean;
  /** Safari n'expose aucun prompt : l'installation passe par une manipulation manuelle. */
  isIos: boolean;
  install: () => Promise<InstallOutcome>;
}

export function usePwaInstall(): PwaInstallState {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(isIOS());

    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    const onDisplayMode = (e: MediaQueryListEvent) => {
      if (e.matches) setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
    window.addEventListener("appinstalled", onInstalled);

    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener("change", onDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener("change", onDisplayMode);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (prompt) {
      const choice = await prompt.prompt().then(() => prompt.userChoice);
      if (choice.outcome === "accepted") setInstalled(true);
      return choice.outcome;
    }
    if (isIos) return "ios-help";
    return "unavailable";
  }, [prompt, isIos]);

  return { canInstall: prompt !== null || isIos, installed, isIos, install };
}
