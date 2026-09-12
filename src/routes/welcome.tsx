// ROUTE D'ENTRÉE INDÉPENDANTE — /welcome
//
// L'onboarding n'est PAS une modale posée sur l'application : c'est une page
// à part entière, hors du layout `_app`. Tant que l'utilisateur n'a pas terminé
// son installation (onboarded + onboardingCompleted), la route `/_app` le
// renvoie ici AVANT de monter le moindre composant applicatif (cf. beforeLoad
// de _app.tsx) — donc aucune caisse, aucun stock, aucune donnée métier derrière.
//
// Machine à états du parcours :
//   WELCOME (mascotte + trois cartes : Créer un compte / Se connecter / Mon expérience)
//     → WIZARD (SetupWizard : confidentialité, enseigne, compte, secteur…)
//       → TUTORIAL (ClusterTutorial : premiers produits ou démo)
//         → /pos (l'application, désormais autorisée par _app)
//
// Design : fond crème de la marque, halos verts très subtils, carte centrale ;
// mobile = vraie page 100vw × 100dvh avec safe-area insets respectés.
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, History, LogIn, ScanLine, Store, Users, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClusterTutorial, SetupWizard } from "@/components/Onboarding";
import { CLUSTER_MAP, getPreferences, savePreferences } from "@/lib/settings";
import {
  getEmployeeId,
  listEmployeeHistory,
  setShopAccount,
  saveShopProfile,
  type EmployeeHistory,
} from "@/lib/db";
import { applyPairingShop, parsePairingPayload, redeemShareToken } from "@/lib/pairing";
import { formatDateShort, formatExperienceDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { enterPairingCode, normPairCode } from "@/lib/syncengine/pairing";
import {
  ensureIdentity,
  setIdentityEmployeeName,
  setIdentityRole,
  refreshShopId,
} from "@/lib/syncengine/identity";

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
  const { scanning, startScan } = useBarcodeScanner();
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
  const [scanningJoin, setScanningJoin] = useState(false);
  const [showEmployeeNameModal, setShowEmployeeNameModal] = useState(false);
  const [employeeNameInput, setEmployeeNameInput] = useState("");
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [scannedPairCode, setScannedPairCode] = useState<string | undefined>();

  function startCreate() {
    setJoinCreds(null);
    setJoinPairCode(undefined);
    setMode("create");
    setPhase("wizard");
  }

  async function startJoinScan() {
    setScanningJoin(true);
    try {
      const raw = await startScan();
      if (!raw) return;
      const parsed = parsePairingPayload(raw);
      if (!parsed) {
        toast.error("Ce code n'est pas un code d'appairage ELYNDRA.");
        return;
      }
      // 0. Identité d'appareil d'abord : le deviceId est nécessaire à la rédemption du jeton.
      const identity = await ensureIdentity();
      // QR v2 (jeton) : réclame le jeton au relais — il renvoie les identifiants OFFICIELS
      // du compte (account_phone/account_name) qui fixent le groupe `s_` partagé, ainsi que
      // le code de paire. QR v1 (mot de passe) : tout est déjà dans le payload.
      let accountName = parsed.name || "";
      let accountPhone = parsed.phone || parsed.shop?.phone || "";
      let pairCode = parsed.pair_code;
      if (parsed.token) {
        const redeem = await redeemShareToken(parsed.token, identity.deviceId);
        if (redeem) {
          if (redeem.account_name) accountName = redeem.account_name;
          if (redeem.account_phone) accountPhone = redeem.account_phone;
          if (redeem.pair_code) pairCode = redeem.pair_code;
        }
      }
      // 1. Applique la copie complète de la boutique du propriétaire.
      await applyPairingShop(parsed.shop);
      // 2. Force le nom de la boutique dans le profil local (pas "Ma boutique").
      const storeFromQr = parsed.shop?.storeName || accountName || "";
      if (storeFromQr) {
        await savePreferences({
          workspaceName: storeFromQr,
          onboarded: true,
          onboardingCompleted: true,
        });
        qc.invalidateQueries({ queryKey: ["preferences"] });
      }
      // 3. Pose le compte en mode "lien" — tél/nom du compte PROPRIÉTAIRE (même groupe P2P,
      //    même `s_...` pour deriveShopId) : c'est ce qui fait converger stock et ventes.
      await setShopAccount({
        name: accountName,
        phone: accountPhone,
        password: "",
        ownerName: "",
      });
      // Force le profil IndexedDB avec les identifiants du compte propriétaire.
      await saveShopProfile({
        storeName: parsed.shop?.storeName || parsed.shop?.ownerName || accountName || "",
        ownerName: "",
        phone: parsed.shop?.phone || accountPhone || "",
        location: parsed.shop?.quarter || "",
        accountName,
        accountPhone,
      });
      // 4. Force le rôle employé et le groupe P2P au scan.
      await setIdentityRole("employee");
      await refreshShopId();
      // 5. Se souvient du code du QR (ou du relais) pour valider la saisie de l'employé.
      setScannedPairCode(pairCode);
      // 6. Ouvre un modal : nom + mot de passe temporaire (le code affiché sous le QR).
      setEmployeeNameInput("");
      setPairCodeInput("");
      setShowEmployeeNameModal(true);
    } catch {
      toast.error("Caméra indisponible — réessayez.");
    } finally {
      setScanningJoin(false);
    }
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

  async function submitEmployeeName() {
    const name = employeeNameInput.trim();
    const code = normPairCode(pairCodeInput);
    if (!name) return;
    if (code.length !== 6) {
      toast.error("Saisissez le mot de passe temporaire (6 caractères, sous le QR).");
      return;
    }
    if (scannedPairCode && normPairCode(scannedPairCode) !== code) {
      toast.error("Ce code ne correspond pas à celui affiché par le propriétaire.");
      return;
    }
    const result = await enterPairingCode(code);
    if (result === "invalid") {
      toast.error("Code invalide — vérifiez-le auprès du propriétaire.");
      return;
    }
    await setIdentityEmployeeName(name);
    toast.success(`Bienvenue ${name} — boutique synchronisée.`);
    savePreferences({ onboarded: true, onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setShowEmployeeNameModal(false);
    navigate({ to: "/pos" });
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
              className="w-40 h-auto rounded-xl sm:w-48"
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

            {/* Trois grands chemins : la création ouvre un compte PROPRIÉTAIRE (crée sa boutique),
                la connexion (employé) scanne le QR du propriétaire et récupère tout via le relais
                (stocks, ventes, entrées/sorties d'argent) — pas de saisie manuelle. */}
            <div className="mt-8 flex w-full flex-col gap-3">
              <WelcomeCard
                tone="primary"
                icon={<Store className="h-5 w-5" />}
                role="Propriétaire"
                title="Créer un compte"
                description="Ouvrir ma boutique, définir mes produits et encaisser."
                onClick={startCreate}
              />
              <WelcomeCard
                tone="neutral"
                icon={<ScanLine className="h-5 w-5" />}
                role="Employé"
                title="Rejoindre via code QR"
                description="Scanner le QR du propriétaire — stock, ventes et encaissements prêts."
                onClick={startJoinScan}
              />
              {employeeId && (
                <WelcomeCard
                  tone="neutral"
                  icon={<History className="h-5 w-5" />}
                  role="Employé"
                  title="Mon expérience"
                  description="Voir les business où j'ai travaillé et ma durée."
                  onClick={() => void openExperience()}
                />
              )}
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

        {/* Modal du nom de l'employé — affiché après le scan QR du propriétaire */}
        {showEmployeeNameModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Nom de l'équipe"
          >
            <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Rejoindre l'équipe</h3>
                  <p className="text-xs text-muted-foreground">
                    Le compte employé est connecté au magasin du propriétaire.
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="emp-name">Votre nom (pour l'équipe)</Label>
                <Input
                  id="emp-name"
                  value={employeeNameInput}
                  onChange={(e) => setEmployeeNameInput(e.target.value)}
                  placeholder="Ex : Jean Yves"
                  className="h-12 text-base"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submitEmployeeName();
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="emp-code">Mot de passe temporaire (sous le QR)</Label>
                <Input
                  id="emp-code"
                  value={pairCodeInput}
                  onChange={(e) => setPairCodeInput(e.target.value)}
                  placeholder="6 caractères"
                  className="h-12 text-base font-mono tracking-widest"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submitEmployeeName();
                    }
                  }}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Le code de 6 caractères visible sur le téléphone du propriétaire, en dessous de
                  son code QR.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEmployeeNameModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={submitEmployeeName}
                  disabled={!employeeNameInput.trim() || normPairCode(pairCodeInput).length !== 6}
                >
                  Valider
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Carte d'entrée de l'écran de bienvenue ──────────────────────────────── */

function WelcomeCard({
  tone,
  icon,
  role,
  title,
  description,
  onClick,
}: {
  tone: "primary" | "neutral";
  icon: ReactNode;
  role: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const primary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          primary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {role && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                primary ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {role}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
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
