import { useState } from "react";
import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Chemin d'installation pour qui est arrivé directement sur l'application sans passer par
 * la page de présentation.
 *
 * Il existait auparavant un bouton flottant en bas à droite de CHAQUE page : il recouvrait
 * du contenu, « Valider la vente » comprise. Ici il ne gêne rien, et disparaît une fois
 * l'application installée.
 */
export function InstallCard() {
  const { canInstall, installed, isIos, platform, insecure, install } = usePwaInstall();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  // Repli orchestré quand aucun prompt natif n'est disponible : cause exacte
  // affichée sous le bouton — jamais le message générique historique.
  const [hint, setHint] = useState<"insecure" | "android-menu" | "desktop-menu" | null>(null);

  if (installed || !canInstall) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" /> Installer l'application
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={async () => {
            const outcome = await install();
            if (outcome === "ios-help") setIosHelpOpen(true);
            if (outcome === "unavailable") {
              setHint(
                insecure ? "insecure" : platform === "android" ? "android-menu" : "desktop-menu",
              );
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Installer
        </Button>
        {hint === "insecure" && (
          <p className="text-sm text-muted-foreground">
            Vous êtes en http sur une adresse locale : les navigateurs n'y proposent jamais
            l'installation. Ouvrez l'application via son adresse <b>https://</b>, puis revenez.
          </p>
        )}
        {hint === "android-menu" && (
          <p className="text-sm text-muted-foreground">
            Menu ⋮ du navigateur → « Installer l'application » (ou « Ajouter à l'écran d'accueil »),
            puis confirmez.
          </p>
        )}
        {hint === "desktop-menu" && (
          <p className="text-sm text-muted-foreground">
            Icône d'installation dans la barre d'adresse, ou menu du navigateur → « Installer
            ELYNDRA CAISSE » (Edge : ⋯ → Applications).
          </p>
        )}
        {/* Contrairement à la page de présentation, aucune navigation préalable n'est
            nécessaire : nous sommes déjà dans l'application, donc dans le périmètre que
            Safari retiendra pour le raccourci. */}
        {(isIos || hint === null) && (
          <p className="text-sm text-muted-foreground">
            Sur iPhone et iPad, l'installation passe par le menu Partager de Safari.
          </p>
        )}
      </CardContent>

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter à l'écran d'accueil</DialogTitle>
            <DialogDescription asChild>
              <ol className="mt-2 space-y-2 text-left text-sm">
                <li>1. Touchez le bouton Partager, en bas de Safari.</li>
                <li>2. Faites défiler puis choisissez « Ajouter à l'écran d'accueil ».</li>
                <li>3. Confirmez avec « Ajouter ».</li>
              </ol>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
