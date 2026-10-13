import { motion } from "framer-motion";
import { Store, ScanLine, History, WifiOff } from "lucide-react";
import { ClusterTutorial, SetupWizard } from "@/components/Onboarding";
import { EmployeeNameModal } from "./EmployeeNameModal";
import { ExperiencePage } from "./ExperiencePage";
import { WelcomeCard } from "./WelcomeCard";
import { useWelcomeFlow } from "./useWelcomeFlow";

export function WelcomePage() {
  const flow = useWelcomeFlow();

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
        {flow.scanningJoin && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <p className="text-sm font-medium text-foreground">Connexion à la boutique en cours…</p>
          </div>
        )}
        {flow.phase === "welcome" && (
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
                onClick={flow.startCreate}
              />
              <WelcomeCard
                tone="neutral"
                icon={<ScanLine className="h-5 w-5" />}
                role="Employé"
                title="Rejoindre via code QR"
                description="Scanner le QR du propriétaire — stock, ventes et encaissements prêts."
                onClick={flow.startJoinScan}
              />
              {flow.employeeId && (
                <WelcomeCard
                  tone="neutral"
                  icon={<History className="h-5 w-5" />}
                  role="Employé"
                  title="Mon expérience"
                  description="Voir les business où j'ai travaillé et ma durée."
                  onClick={() => void flow.openExperience()}
                />
              )}
            </div>

            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <WifiOff className="h-3 w-3" /> 100% hors ligne · vos données restent chez vous
            </span>
          </motion.div>
        )}

        {flow.phase === "wizard" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-center"
          >
            <SetupWizard
              initialAccountMode={flow.mode}
              initialCredentials={flow.joinCreds}
              initialPairCode={flow.joinPairCode}
              initialStep={flow.joinCreds ? 2 : undefined}
              onComplete={() => flow.setPhase("tutorial")}
            />
          </motion.div>
        )}

        {flow.phase === "tutorial" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-center"
          >
            <ClusterTutorial onComplete={flow.finishTutorial} />
          </motion.div>
        )}

        {flow.phase === "experience" && flow.employeeId && flow.history && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-center"
          >
            <ExperiencePage
              employeeId={flow.employeeId}
              history={flow.history}
              onBack={() => flow.setPhase("welcome")}
              onJoin={() => void flow.joinNewBusiness()}
            />
          </motion.div>
        )}

        {/* Modal du nom de l'employé — affiché après le scan QR du propriétaire */}
        {flow.showEmployeeNameModal && (
          <EmployeeNameModal
            name={flow.employeeNameInput}
            phone={flow.employeePhoneInput}
            code={flow.pairCodeInput}
            onNameChange={flow.setEmployeeNameInput}
            onPhoneChange={flow.setEmployeePhoneInput}
            onCodeChange={flow.setPairCodeInput}
            onCancel={() => flow.setShowEmployeeNameModal(false)}
            onSubmit={flow.submitEmployeeName}
          />
        )}
      </main>
    </div>
  );
}
