import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  type BeforeInstallPromptEvent,
  isIOS,
  isStandalone,
  registerServiceWorker,
  requestPersistentStorage,
} from "@/lib/pwa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    requestPersistentStorage();

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

  const canInstall = prompt !== null || isIOS();
  if (installed || isStandalone() || !canInstall) return null;

  async function handleInstall() {
    if (prompt) {
      const choice = await prompt.prompt().then(() => prompt.userChoice);
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }
    if (isIOS()) {
      setShowIosHelp(true);
    }
  }

  return (
    <>
      <Button
        size="lg"
        onClick={handleInstall}
        aria-label="Télécharger l'application"
        className="fixed bottom-4 right-4 z-40 rounded-full shadow-lg gap-2"
      >
        <Download className="h-5 w-5" />
        Télécharger l'app
      </Button>

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Installer l'application</DialogTitle>
            <DialogDescription>
              Sur iPhone/iPad : ouvrez le menu Partager dans Safari, puis choisissez « Ajouter à
              l'écran d'accueil ».
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
