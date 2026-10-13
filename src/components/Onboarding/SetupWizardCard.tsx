import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { savePreferences } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { finishSetup } from "./finishSetup";
import type { SetupWizardApi } from "./useSetupWizard";
import { PrivacyStep } from "./steps/PrivacyStep";
import { NameStep } from "./steps/NameStep";
import { AccountStep } from "./steps/AccountStep";
import { ContactStep } from "./steps/ContactStep";
import { ActivityStep } from "./steps/ActivityStep";

export function SetupWizardCard({ w }: { w: SetupWizardApi }) {
  return (
    // CARTE DE PAGE (plus aucun Dialog) : ce composant vit dans la route /welcome,
    // pleine page indépendante — rien de l'application ne peut apparaître derrière.
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 text-left shadow-sm sm:p-6">
      <h1 className="sr-only">Configuration de votre boutique</h1>

      {/* Barre de progression */}
      <div className="flex gap-1">
        {Array.from({ length: w.totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= w.step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Étape {w.step + 1} sur {w.totalSteps}
      </p>

      {/* Hauteur minimale bornée : les étapes du wizard restent stables d'un
          écran à l'autre sans exiger 260px de haut sur un téléphone couché. */}
      <div className="min-h-[min(260px,40dvh)] py-2">
        {w.step === 0 && <PrivacyStep w={w} />}
        {w.step === 1 && <NameStep w={w} />}
        {w.step === 2 && <AccountStep w={w} />}
        {w.step === 3 && <ContactStep w={w} />}
        {w.step === 4 && <ActivityStep w={w} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            savePreferences({ onboarded: true });
            w.qc.invalidateQueries({ queryKey: ["preferences"] });
            w.onComplete();
          }}
        >
          Passer
        </Button>
        <div className="flex gap-2">
          {w.step > 0 && (
            <Button variant="outline" onClick={w.goPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
          )}
          {w.step < w.totalSteps - 1 ? (
            <Button onClick={w.goNext} disabled={!w.canNext()}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => void finishSetup(w)} disabled={!w.canNext()}>
              <Check className="h-4 w-4 mr-1" /> Terminer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
