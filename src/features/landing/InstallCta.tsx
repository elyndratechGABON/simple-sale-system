import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Download,
  Monitor,
  Share,
  ShieldAlert,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Appel à l'action — NE PAS MODIFIER L'ORDRE : Safari construit le raccourci iOS
// depuis la page OUVERTE, donc on navigue vers /pos AVANT d'afficher les étapes.
// ============================================================================

export function InstallCta({ compact = false, label }: { compact?: boolean; label?: string }) {
  const navigate = useNavigate();
  const { canInstall, installed, isIos, platform, insecure, install } = usePwaInstall();
  // Repli ORCHESTRÉ : chaque cas a SON explication et SA marche à suivre — plus
  // aucun message générique du type « ce navigateur ne propose pas… ».
  const [help, setHelp] = useState<"ios" | "insecure" | "android-menu" | "desktop-menu" | null>(
    null,
  );

  if (installed) {
    return (
      <Button
        size={compact ? "default" : "lg"}
        className={`${compact ? "h-10 px-5" : "h-14 px-8"} text-base gap-2`}
        onClick={() => navigate({ to: "/pos" })}
      >
        <ShoppingCart className="h-5 w-5" />
        Ouvrir ELYNDRA CAISSE
      </Button>
    );
  }

  function routeFallback() {
    // Ordre de diagnostic : contexte d'abord (cause racine), plateforme ensuite.
    if (insecure) setHelp("insecure");
    else if (isIos || platform === "ios") setHelp("ios");
    else if (platform === "android") setHelp("android-menu");
    else setHelp("desktop-menu");
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          size={compact ? "default" : "lg"}
          className={`${compact ? "h-10 px-5" : "h-14 px-8"} text-base gap-2`}
          onClick={async () => {
            const outcome = await install();
            if (outcome === "accepted" || outcome === "dismissed") return;
            if (outcome === "unavailable") {
              routeFallback();
              return;
            }
            // Safari construit le raccourci « Ajouter à l'écran d'accueil » à partir de la
            // page OUVERTE à cet instant, pas à partir du `start_url` du manifest. Suivre
            // les instructions depuis cette page produirait donc une icône qui rouvre la
            // page de présentation. On amène l'utilisateur sur la caisse AVANT d'expliquer
            // la manipulation. Ne pas inverser cet ordre.
            await navigate({ to: "/pos" });
            setHelp("ios");
          }}
        >
          <Download className={compact ? "h-4 w-4" : "h-5 w-5"} />
          {label ?? "Installer l'application"}
        </Button>
        {!compact && (
          <Button asChild size="lg" variant="outline" className="h-14 px-6 text-base gap-2">
            <a href="#fonctionnalites">
              Découvrir l'application
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <Dialog open={help !== null} onOpenChange={(v) => !v && setHelp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {help === "insecure" ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-500" /> Connexion non sécurisée
                </>
              ) : help === "desktop-menu" ? (
                <>
                  <Monitor className="h-5 w-5" /> Installer sur votre ordinateur
                </>
              ) : help === "android-menu" ? (
                <>
                  <Smartphone className="h-5 w-5" /> Installation sur Android
                </>
              ) : (
                <>
                  <Share className="h-5 w-5" /> Ajouter à l'écran d'accueil
                </>
              )}
            </DialogTitle>
            <DialogDescription asChild>
              {help === "insecure" ? (
                <div className="mt-2 space-y-2 text-left text-sm">
                  <p>
                    Vous ouvrez l'application en <b>http</b> sur une adresse locale : les
                    navigateurs n'y proposent jamais l'installation.
                  </p>
                  <p>
                    Ouvrez l'adresse <b>https://</b> de l'application (ou passez par une caisse déjà
                    installée), puis revenez : le bouton déclenchera l'installation native.
                  </p>
                  <p>
                    En attendant, tout fonctionne dans cet onglet et reste enregistré sur cet
                    appareil.
                  </p>
                </div>
              ) : help === "android-menu" ? (
                <ol className="mt-2 space-y-2 text-left text-sm">
                  <li>1. Ouvrez le menu ⋮ du navigateur, en haut à droite.</li>
                  <li>
                    2. Choisissez « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
                  </li>
                  <li>3. Confirmez : l'icône rejoint votre écran d'accueil.</li>
                </ol>
              ) : help === "desktop-menu" ? (
                <div className="mt-2 space-y-2 text-left text-sm">
                  <p>
                    Cliquez l'icône d'installation dans la barre d'adresse (écran ou ⊕), puis
                    confirmez.
                  </p>
                  <p>
                    Sinon : menu du navigateur → « Installer ELYNDRA CAISSE » (Edge : ⋯ →
                    Applications).
                  </p>
                </div>
              ) : (
                <ol className="mt-2 space-y-2 text-left text-sm">
                  <li>1. Touchez le bouton Partager, en bas de Safari.</li>
                  <li>2. Faites défiler puis choisissez « Ajouter à l'écran d'accueil ».</li>
                  <li>3. Confirmez avec « Ajouter ».</li>
                </ol>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
