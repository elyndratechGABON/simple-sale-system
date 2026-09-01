// ROUTE D'ENTRÉE INDÉPENDANTE — /welcome
//
// L'onboarding n'est PAS une modale posée sur l'application : c'est une page
// à part entière, hors du layout `_app`. Tant que l'utilisateur n'a pas terminé
// son installation (onboarded + onboardingCompleted), la route `/_app` le
// renvoie ici AVANT de monter le moindre composant applicatif (cf. beforeLoad
// de _app.tsx) — donc aucune caisse, aucun stock, aucune donnée métier derrière.
//
// Machine à états du parcours :
//   WELCOME (héro + choix Créer / Se connecter)
//     → WIZARD (SetupWizard : confidentialité, enseigne, compte, secteur…)
//       → TUTORIAL (ClusterTutorial : premiers produits ou démo)
//         → /pos (l'application, désormais autorisée par _app)
//
// Design : fond crème de la marque, halos verts très subtils, carte centrale ;
// mobile = vraie page 100vw × 100dvh avec safe-area insets respectés.
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, KeyRound, LogIn, QrCode, Store, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClusterTutorial, SetupWizard } from "@/components/Onboarding";
import { CLUSTER_MAP, getPreferences, savePreferences } from "@/lib/settings";
import { applyPairingShop, parsePairingPayload } from "@/lib/pairing";
import { setShopAccount } from "@/lib/db";
import { enterPairingCode } from "@/lib/syncengine/pairing";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import type { PairingShopInfo } from "@/lib/pairing";
import { toast } from "sonner";

export const Route = createFileRoute("/welcome")({
  // Utilisateur déjà installé → straight to the till : rafraîchissement,
  // réouverture du navigateur, deep-link… rien ne repasse par l'onboarding.
  beforeLoad: () => {
    const prefs = getPreferences();
    if (prefs.onboarded && prefs.onboardingCompleted) {
      throw redirect({ to: "/pos" });
    }
  },
  component: WelcomePage,
});

type Phase = "welcome" | "wizard" | "tutorial";
type EntryMode = "create" | "join";

/** Libellé du type de boutique (cluster) scanné, pour la carte d'infos du popup. */
function shopTypeLabel(cluster?: string): string {
  if (typeof cluster === "string" && cluster in CLUSTER_MAP) {
    return CLUSTER_MAP[cluster as keyof typeof CLUSTER_MAP].label;
  }
  return "Boutique";
}

/** Cluster récupéré par le scan pour tracer le type d'activité scanné. */
function clusterFromScan(payload: PairingShopInfo): string | undefined {
  const cluster = payload.shop?.cluster;
  if (typeof cluster === "string" && cluster in CLUSTER_MAP) return cluster;
  return undefined;
}

function WelcomePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  // Reprendre AU BON ENDROIT : installé mais tutoriel non vu → tutoriel direct
  // (cas d'un onboarding interrompu après l'assistant).
  const [phase, setPhase] = useState<Phase>(() => {
    const prefs = getPreferences();
    return prefs.onboarded && !prefs.onboardingCompleted ? "tutorial" : "welcome";
  });
  const [mode, setMode] = useState<EntryMode>("create");
  const [joinCreds, setJoinCreds] = useState<{ phone: string; password: string } | null>(null);
  const [joinPairCode, setJoinPairCode] = useState<string | undefined>();
  // Cluster scanné : pré-remplit le secteur d'activité du wizard si l'on revient là
  // via « Se connecter » après un scan (au lieu de le redemander à l'étape 3).
  const [joinCluster, setJoinCluster] = useState<string | undefined>();
  // Popup de confirmation post-scan : affiche la boutique scannée + le champ du code
  // temporaire. L'accès à la boutique se décide ICI (rejoindre directement), plus
  // rien de l'assistant n'est demandé — le QR porte tout.
  const [scanInfo, setScanInfo] = useState<PairingShopInfo | null>(null);
  const [tempCode, setTempCode] = useState("");
  const [accepting, setAccepting] = useState(false);
  const { startScan } = useBarcodeScanner();

  /** « Rejoindre via code QR » : scan DIRECT depuis l'écran de bienvenue, puis popup
   *  de confirmation affichant la boutique scannée et le champ du code temporaire. */
  async function joinViaQr() {
    try {
      const raw = await startScan();
      if (raw === null) return;
      const parsed = parsePairingPayload(raw);
      if (!parsed) {
        toast.error("Ce code n'est pas un code d'appairage ELYNDRA.");
        return;
      }
      setJoinCreds({ phone: parsed.phone, password: parsed.password });
      setJoinCluster(clusterFromScan(parsed));
      setJoinPairCode(undefined);
      setTempCode("");
      setAccepting(false);
      setScanInfo(parsed);
    } catch {
      toast.error(
        "Caméra indisponible — utilisez « Se connecter » et saisissez le téléphone à la main.",
      );
    }
  }

  /** Accepter : copie la boutique scannée, pose le compte, s'annonce avec le code de
   *  paire, et OUVRE DIRECTEMENT la boutique — plus rien de l'assistant n'est demandé. */
  async function acceptViaQr() {
    if (!scanInfo || !joinCreds) return;
    setAccepting(true);
    try {
      const applied = await applyPairingShop(scanInfo.shop);
      const store = scanInfo.shop?.storeName || scanInfo.name || "Ma boutique";
      await setShopAccount({
        name: store,
        phone: joinCreds.phone,
        password: joinCreds.password,
        ownerName: scanInfo.shop?.ownerName ?? "",
      });
      if (tempCode.trim()) {
        await enterPairingCode(tempCode).catch(() => {});
      }
      savePreferences({
        workspaceName: store,
        ownerName: scanInfo.shop?.ownerName ?? "",
        phone: scanInfo.shop?.phone ?? "",
        quarter: scanInfo.shop?.quarter ?? "",
        cluster: scanInfo.shop?.cluster ?? "retail",
        onboarded: true,
        onboardingCompleted: true,
        privacyAccepted: true,
      });
      qc.invalidateQueries({ queryKey: ["preferences"] });
      setScanInfo(null);
      toast.success(
        applied
          ? `Boutique « ${store} » rejointe — accès direct.`
          : "Boutique rejointe — accès direct.",
      );
      navigate({ to: "/pos" });
    } catch {
      setAccepting(false);
      toast.error("Impossible d'enregistrer la boutique — réessayez.");
    }
  }

  function startCreate() {
    setJoinCreds(null);
    setJoinPairCode(undefined);
    setMode("create");
    setPhase("wizard");
  }

  function startJoinManual() {
    setJoinCreds(null);
    setJoinPairCode(undefined);
    setMode("join");
    setPhase("wizard");
  }

  function finishTutorial() {
    savePreferences({ onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    navigate({ to: "/pos" });
  }

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Décor : halos et cercles verts très subtils, identité Elyndra */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute left-[-4rem] top-1/3 h-44 w-44 rounded-full border border-primary/15" />
        <div className="absolute right-[12%] top-[8%] h-3 w-3 rounded-full bg-primary/30" />
        <div className="absolute left-[14%] bottom-[18%] h-2 w-2 rounded-full bg-primary/25" />
      </div>

      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center">
        {phase === "welcome" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex w-full flex-col items-center text-center"
          >
            {/* Mascotte de la marque (logo/bienvenu.png, réduit en webp) */}
            <img
              src="/welcome.webp"
              alt="ELYNDRA CAISSE"
              width={560}
              height={582}
              className="w-44 h-auto rounded-xl sm:w-52"
            />

            <div className="mt-5 space-y-2">
              <h1 className="text-page-title font-bold tracking-tight">
                Bienvenue sur <span className="text-primary">ELYNDRA CAISSE</span>
              </h1>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                Gérez vos ventes, vos stocks et votre activité depuis un seul espace — même sans
                connexion internet.
              </p>
            </div>

            <ul className="mt-6 w-full max-w-xs space-y-2.5 text-left text-sm">
              {[
                "Encaissez vos ventes en temps réel",
                "Gérez votre stock automatiquement",
                "Suivez vos performances",
                "Fonctionne hors connexion",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-3">
              <Button size="lg" className="h-13 w-full px-8 text-base" onClick={startCreate}>
                Créer mon compte <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <p className="text-sm text-muted-foreground">Déjà inscrit ?</p>
              <Button
                variant="ghost"
                className="-mt-2 h-11 gap-2 text-base"
                onClick={startJoinManual}
              >
                <LogIn className="h-4 w-4" /> Se connecter
              </Button>
              <Button
                variant="outline"
                className="-mt-2 h-11 gap-2 text-base"
                onClick={() => void joinViaQr()}
              >
                <QrCode className="h-4 w-4" /> Rejoindre via code QR
              </Button>
            </div>

            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <WifiOff className="h-3 w-3" /> 100% hors ligne · vos données restent chez vous
            </span>
          </motion.div>
        )}

        {phase === "wizard" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-center"
          >
            <SetupWizard
              initialAccountMode={mode}
              initialCredentials={joinCreds}
              initialPairCode={joinPairCode}
              initialCluster={joinCluster}
              initialStep={joinCreds ? 2 : undefined}
              onComplete={() => setPhase("tutorial")}
            />
          </motion.div>
        )}

        {phase === "tutorial" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-center"
          >
            <ClusterTutorial onComplete={finishTutorial} />
          </motion.div>
        )}
      </main>

      {/* Popup post-scan : la boutique scannée y est affichée (nom, type, coordonnées),
          l'utilisateur saisit le code de confirmation TEMPORAIRE affiché par la caisse
          principale, puis accède DIRECTEMENT à la boutique — plus rien n'est demandé. */}
      {scanInfo && joinCreds && (
        <Dialog open onOpenChange={() => setScanInfo(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Rejoindre cette boutique
              </DialogTitle>
              <DialogDescription>
                La caisse scannée partage ses accès. Vérifiez, saisissez le code temporaire affiché
                sur la caisse principale, puis accédez directement à toutes ses données.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Carte d'infos de la boutique scannée — déjà enregistrées grâce au QR */}
              <div className="rounded-xl border bg-card p-4">
                <p className="text-lg font-semibold">
                  {scanInfo.shop?.storeName || scanInfo.name || joinCreds.phone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {shopTypeLabel(scanInfo.shop?.cluster)}
                </p>
                <p className="text-xs text-muted-foreground">{joinCreds.phone}</p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <KeyRound className="h-4 w-4 shrink-0 text-primary" />
                  Saisissez le code temporaire de la caisse principale
                </p>
                <Input
                  id="join-code"
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                  placeholder="A1B2C3"
                  className="h-12 font-mono tracking-widest"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoFocus
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    !accepting &&
                    tempCode.trim().length >= 6 &&
                    void acceptViaQr()
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Sur l'autre téléphone : Réglages → Appareils → « Ajouter un appareil ». Le code
                  est affiché en grand, valable 10 minutes.
                </p>
              </div>
            </div>

            <DialogFooter>
              <DialogClose>Annuler</DialogClose>
              <Button
                type="button"
                onClick={() => void acceptViaQr()}
                disabled={accepting || tempCode.trim().length < 6}
              >
                {accepting ? "Connexion…" : "Rejoindre"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
