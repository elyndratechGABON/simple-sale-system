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
import { ArrowRight, Check, History, LogIn, ScanLine, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClusterTutorial, SetupWizard } from "@/components/Onboarding";
import { CLUSTER_MAP, getPreferences, savePreferences } from "@/lib/settings";
import { getEmployeeId, listEmployeeHistory, setShopAccount, type EmployeeHistory } from "@/lib/db";
import { formatDateShort, formatExperienceDuration } from "@/lib/format";
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

type Phase = "welcome" | "wizard" | "tutorial" | "experience";
type EntryMode = "create" | "join";

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
  const [employeeId, setEmployeeId] = useState<string | null>(() => getEmployeeId());
  const [history, setHistory] = useState<EmployeeHistory[] | null>(null);

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

  /** Ouvre le carnet « Mon expérience » : liste des business travaillés + durée. */
  async function openExperience() {
    const id = getEmployeeId();
    if (!id) return;
    setEmployeeId(id);
    setHistory(await listEmployeeHistory(id));
    setPhase("experience");
  }

  /** Depuis le carnet, repart vers un nouveau business : la machine d'onboarding en
   *  mode « join » (scan du QR d'une caisse déjà abonnée). */
  async function joinNewBusiness() {
    setJoinCreds(null);
    setJoinPairCode(undefined);
    setMode("join");
    setPhase("wizard");
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
            </div>

            {employeeId && (
              <Button
                variant="outline"
                className="mt-2 h-11 w-full max-w-xs gap-2 text-sm"
                onClick={() => void openExperience()}
              >
                <History className="h-4 w-4" /> Mon expérience
              </Button>
            )}

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

        {phase === "experience" && employeeId && history && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-center"
          >
            <ExperiencePage
              employeeId={employeeId}
              history={history}
              onBack={() => setPhase("welcome")}
              onJoin={() => void joinNewBusiness()}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}

/* ── Carnet d'expérience employé ──────────────────────────────────────────── */

function ExperiencePage({
  employeeId,
  history,
  onBack,
  onJoin,
}: {
  employeeId: string;
  history: EmployeeHistory[];
  onBack: () => void;
  onJoin: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  // Durée totale du carnet : les expériences fermées portent leur durée, une expérience
  // encore ouverte est comptée jusqu'à maintenant (défense — le welcome n'y accède pas).
  const totalDays = history.reduce((sum, h) => {
    if (h.endedAt) return sum + h.durationDays;
    return sum + Math.max(1, Math.round((Date.now() - h.startedAt) / 86_400_000));
  }, 0);

  /** Un QR de profil porteur du résumé du carnet : le propriétaire d'un nouveau
   *  business peut le scanner pour vérifier l'expérience déclarée. */
  async function showQrProfile() {
    setQrError(false);
    setQrDataUrl(null);
    try {
      const payload = {
        app: "ecaisse",
        type: "exp-profile",
        employee: employeeId,
        stores: history.map((h) => ({
          name: h.storeName,
          cluster: h.cluster,
          days: h.endedAt
            ? h.durationDays
            : Math.max(1, Math.round((Date.now() - h.startedAt) / 86_400_000)),
        })),
      };
      const { default: QRCodeLib } = await import("qrcode");
      setQrDataUrl(await QRCodeLib.toDataURL(JSON.stringify(payload)));
    } catch {
      setQrError(true);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 text-left shadow-sm sm:p-6">
      <h1 className="sr-only">Mon expérience</h1>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Mon expérience</h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Retour
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Les business où vous avez travaillé, 100 % enregistré sur votre téléphone.
      </p>

      {history.length > 0 ? (
        <>
          <div className="mt-4 space-y-3">
            {history.map((h) => {
              const endDay = h.endedAt
                ? h.durationDays
                : Math.max(1, Math.round((Date.now() - h.startedAt) / 86_400_000));
              return (
                <div key={h.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{h.storeName}</p>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {formatExperienceDuration(endDay)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {CLUSTER_MAP[h.cluster]?.label ?? "Activité"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateShort(h.startedAt)} →{" "}
                    {h.endedAt ? formatDateShort(h.endedAt) : "aujourd'hui"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border bg-accent/40 p-3 text-sm">
            <span className="font-medium">
              {history.length} business {history.length > 1 ? "travaillés" : "travaillé"} ·{" "}
              {formatExperienceDuration(totalDays)} au total
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <Button size="lg" className="w-full gap-2" onClick={onJoin}>
              <ScanLine className="h-4 w-4" /> Scanner un QR pour rejoindre un nouveau business
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => void showQrProfile()}>
              <History className="h-4 w-4" /> Afficher mon QR profil
            </Button>
          </div>

          {qrError && (
            <p className="mt-2 text-center text-xs text-destructive">
              Impossible de générer le QR — réessayez.
            </p>
          )}
          {qrDataUrl && (
            <div className="mt-3 text-center space-y-1">
              <img
                src={qrDataUrl}
                alt="QR profil expérience"
                className="mx-auto h-44 w-44 rounded-lg border"
              />
              <p className="text-xs text-muted-foreground">
                Présentez ce QR à un propriétaire pour prouver votre expérience.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune expérience pour le moment. Rejoignez un business pour commencer.
          </p>
          <Button size="lg" className="w-full gap-2" onClick={onJoin}>
            <ScanLine className="h-4 w-4" /> Scanner un QR pour rejoindre un business
          </Button>
        </div>
      )}
    </div>
  );
}
