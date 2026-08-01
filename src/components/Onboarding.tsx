// Assistant de premier lancement. Ne s'affiche qu'UNE fois : le drapeau `onboarded`
// est écrit dans localStorage à la sortie, quel que soit le chemin de sortie (terminé
// ou passé). Aucune étape n'est bloquante — un commerçant qui ouvre l'application pour
// encaisser tout de suite doit pouvoir le faire.
//
// Le plan d'origine distinguait « choisir le dossier » et « demander l'autorisation ».
// Ce sont la MÊME interaction navigateur : `showDirectoryPicker({ mode: "readwrite" })`
// accorde l'autorisation au moment du choix, il n'y a rien à demander ensuite. Les deux
// étapes sont donc fusionnées ici — les séparer afficherait un écran sans action.
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FolderOpen, Palette, Store } from "lucide-react";
import {
  applyTheme,
  getPreferences,
  PRESET_HUES,
  savePreferences,
  swatchColor,
} from "@/lib/settings";
import { canPickDirectory, pickDocumentsDirectory } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STEPS = ["Espace de travail", "Couleur", "Documents"] as const;

export function Onboarding() {
  // `getPreferences()` lit localStorage : indisponible au rendu serveur, et l'évaluer
  // pendant le rendu casserait l'hydratation. D'où l'ouverture décidée après montage.
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [hue, setHue] = useState(PRESET_HUES[0].hue);
  const [directory, setDirectory] = useState<string | null>(null);
  const [canPick, setCanPick] = useState(false);

  useEffect(() => {
    const prefs = getPreferences();
    setName(prefs.workspaceName);
    setHue(prefs.hue);
    setCanPick(canPickDirectory());
    if (!prefs.onboarded) setOpen(true);
  }, []);

  // Aperçu en direct : la couleur s'applique au document dès la sélection, pour que le
  // choix se juge sur l'application réelle et pas sur une pastille de 32 pixels.
  useEffect(() => {
    if (open) applyTheme(hue);
  }, [hue, open]);

  function finish() {
    savePreferences({
      workspaceName: name.trim() || getPreferences().workspaceName,
      hue,
      onboarded: true,
    });
    applyTheme(hue);
    setOpen(false);
  }

  function skip() {
    // Les préférences déjà touchées sont conservées : passer l'assistant ne doit pas
    // annuler une couleur que l'utilisateur vient de choisir avant de se raviser.
    savePreferences({ onboarded: true });
    setOpen(false);
  }

  return (
    <Dialog open={open}>
      {/* Ni croix ni fermeture au clic extérieur : la sortie passe par « Passer » ou
          « Terminer », les deux écrivent le drapeau. Sans ça l'assistant reviendrait
          à chaque rechargement. */}
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Configuration de l'application</DialogTitle>

        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "mt-1.5 block text-xs",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="min-h-[240px] py-2">
          {step === 0 && (
            <StepShell
              icon={Store}
              title="Bienvenue"
              description="Quel est le nom de votre commerce ? Il apparaîtra dans l'application et en tête de vos documents exportés."
            >
              <Label htmlFor="ob-name">Nom de l'entreprise</Label>
              <Input
                id="ob-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Alimentation Chez Marie"
                className="h-12 text-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") setStep(1);
                }}
              />
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              icon={Palette}
              title="Couleur principale"
              description="Elle habille les boutons, les totaux et les graphiques. L'aperçu est immédiat."
            >
              <div className="grid grid-cols-5 gap-3">
                {PRESET_HUES.map((p) => (
                  <button
                    key={p.hue}
                    type="button"
                    onClick={() => setHue(p.hue)}
                    aria-label={p.label}
                    aria-pressed={hue === p.hue}
                    className={cn(
                      "aspect-square rounded-xl border-2 transition-transform flex items-center justify-center",
                      hue === p.hue
                        ? "border-foreground scale-105"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: swatchColor(p.hue) }}
                  >
                    {hue === p.hue && <Check className="h-5 w-5 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              icon={FolderOpen}
              title="Dossier des documents"
              description="Rapports, exports et sauvegardes y seront enregistrés automatiquement."
            >
              {canPick ? (
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full h-12"
                    onClick={async () => {
                      const picked = await pickDocumentsDirectory();
                      if (picked) setDirectory(picked);
                    }}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {directory ? "Changer de dossier" : "Choisir un dossier"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {directory
                      ? `Dossier choisi : « ${directory} ». L'autorisation d'écriture est accordée.`
                      : "Facultatif. Sans dossier, les fichiers partent dans Téléchargements."}
                  </p>
                </div>
              ) : (
                // Chrome Android, Firefox Android et Safari iOS n'ont pas de sélecteur de
                // dossier : il n'y a rien à choisir, seulement à expliquer. Cf. src/lib/files.ts.
                <p className="text-sm text-muted-foreground">
                  Sur cet appareil, le navigateur ne permet pas de choisir un dossier. Vos documents
                  seront proposés au partage ou enregistrés dans Téléchargements. L'application
                  Android, elle, écrit directement dans le dossier Documents.
                </p>
              )}
            </StepShell>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" onClick={skip}>
            Passer
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish}>
                <Check className="h-4 w-4 mr-1" /> Terminer
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Tout est modifiable plus tard dans Paramètres.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function StepShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Store;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-accent p-2 text-accent-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
