// Assistant de premier lancement. Ne s'affiche qu'UNE fois : le drapeau `onboarded`
// est écrit dans localStorage à la sortie, quel que soit le chemin de sortie (terminé
// ou passé). Aucune étape n'est bloquante — un commerçant qui ouvre l'application pour
// encaisser tout de suite doit pouvoir le faire.
//
// Trois étapes seulement : nom + couleur (le décor), type de commerce (le déroulé du
// service), puis confirmation. Le système de tables se déduit du type (un restaurant
// sert en plusieurs passages, un snack encaisse sur-le-champ) et se corrige dans
// Paramètres ; le dossier des documents aussi — inutile d'en faire des étapes, c'est
// de la configuration, pas du service.
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChefHat, ChevronLeft, ChevronRight, CupSoda, Palette, Store } from "lucide-react";
import {
  applyTheme,
  getPreferences,
  PRESET_HUES,
  savePreferences,
  swatchColor,
  type BusinessType,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STEPS = ["Espace de travail", "Type de commerce", "C'est prêt"] as const;

export function Onboarding() {
  // `getPreferences()` lit localStorage : indisponible au rendu serveur, et l'évaluer
  // pendant le rendu casserait l'hydratation. D'où l'ouverture décidée après montage.
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [hue, setHue] = useState(PRESET_HUES[0].hue);
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant");
  const [tablesEnabled, setTablesEnabled] = useState(true);

  // Monté par `src/routes/_app.tsx`, donc jamais sur la page publique de présentation.
  // C'est ce qui autorise l'ouverture automatique ci-dessous : ce dialogue est BLOQUANT
  // (ni croix, ni échappement, ni clic extérieur) et n'a rien à faire devant un visiteur
  // qui ne sait pas encore ce qu'il regarde.
  useEffect(() => {
    const prefs = getPreferences();
    setName(prefs.workspaceName);
    setHue(prefs.hue);
    setBusinessType(prefs.businessType);
    setTablesEnabled(prefs.tablesEnabled);
    if (!prefs.onboarded) setOpen(true);
  }, []);

  // Aperçu en direct : la couleur s'applique au document dès la sélection, pour que le
  // choix se juge sur l'application réelle et pas sur une pastille de 32 pixels.
  useEffect(() => {
    if (open) applyTheme(hue);
  }, [hue, open]);

  // Un restaurant commande avant d'encaisser, un snack encaisse sur-le-champ : le choix
  // du type oriente donc le système de tables. Corrigeable plus tard dans Paramètres.
  function chooseType(type: BusinessType) {
    setBusinessType(type);
    setTablesEnabled(type === "restaurant");
  }

  function finish() {
    savePreferences({
      workspaceName: name.trim() || getPreferences().workspaceName,
      hue,
      businessType,
      tablesEnabled,
      onboarded: true,
    });
    applyTheme(hue);
    // Le cache React Query des préférences est `staleTime: Infinity` (cf. use-preferences) :
    // sans invalidation, l'en-tête et la caisse garderaient les valeurs d'avant l'assistant.
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setOpen(false);
  }

  function skip() {
    // Les préférences déjà touchées sont conservées : passer l'assistant ne doit pas
    // annuler une couleur que l'utilisateur vient de choisir avant de se raviser.
    savePreferences({ onboarded: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
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
              <div>
                <Label>Couleur principale</Label>
                <p className="text-sm text-muted-foreground">
                  Elle habille les boutons, les totaux et les graphiques. L'aperçu est immédiat.
                </p>
                <div className="mt-2 grid grid-cols-5 gap-3">
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
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              icon={ChefHat}
              title="Type de commerce"
              description="Cela règle le déroulé du service : encaissement immédiat pour un snack, commande puis encaissement pour un restaurant."
            >
              <div className="grid grid-cols-1 gap-3">
                <ChoiceButton
                  selected={businessType === "snack"}
                  onClick={() => chooseType("snack")}
                  icon={CupSoda}
                  title="Snack / Bar"
                  description="Service direct au comptoir : on encaisse sur-le-champ."
                />
                <ChoiceButton
                  selected={businessType === "restaurant"}
                  onClick={() => chooseType("restaurant")}
                  icon={ChefHat}
                  title="Restaurant / Fastfood"
                  description="On prend la commande, on sert le plat, puis on encaisse."
                />
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              icon={Check}
              title="C'est prêt"
              description="Voici ce qui est configuré. Le reste — liste des tables, dossier des documents, code PIN — se règle dans Paramètres."
            >
              <div className="space-y-2 rounded-lg border p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Commerce</span>
                  <span className="font-medium truncate">
                    {name.trim() || getPreferences().workspaceName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">
                    {businessType === "restaurant"
                      ? "Commande puis encaissement"
                      : "Encaissement immédiat"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tables</span>
                  <span className="font-medium">
                    {tablesEnabled ? "Avec tables" : "Sans tables"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Couleur</span>
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: swatchColor(hue) }}
                  />
                </div>
              </div>
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

/** Carte de choix d'une étape binaire (type de commerce). */
function ChoiceButton({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: typeof Store;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-accent ring-2 ring-primary ring-offset-1"
          : "bg-card hover:border-primary hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "mt-0.5 rounded-lg p-2",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      {selected && <Check className="ml-auto mt-1 h-5 w-5 shrink-0 text-primary" />}
    </button>
  );
}
