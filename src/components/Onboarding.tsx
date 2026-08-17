// Assistant de premier lancement — deux voies séquentielles :
//
// 1. **Wizard de configuration** (7 étapes) : nom, couleur, téléphone, quartier,
//    propriétaire, types de produits → cluster déduit, confirmation.  Sauvegarde
//    `onboarded: true` dans localStorage.  Bloquant (ni croix, ni échappement).
//
// 2. **Guide fonctionnel** (4 étapes, carrousel) : présentation des grands écrans.
//    Sauvegarde `onboardingCompleted: true`.  Passable d'un simple clic.
//
// Les deux ne s'affichent qu'une seule fois.  Le guide vient après le wizard :
// il n'apparaît que si le wizard est terminé mais que le guide n'a pas été vu.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Phone,
  Settings,
  ShoppingCart,
  BarChart3,
  User,
} from "lucide-react";
import { ChefHat, Coffee, Scissors, ShoppingBag, Shirt, Weight, Store } from "lucide-react";
import {
  applyTheme,
  CLUSTER_MAP,
  getPreferences,
  ACTIVE_CLUSTERS,
  PRESET_HUES,
  savePreferences,
  swatchColor,
  type ClusterId,
  type SubCategory,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ── Carrousel guide ──────────────────────────────────────────────────────── */

const GUIDE_STEPS = [
  {
    icon: Package,
    title: "Ajoutez vos produits",
    description: "Gérez vos stocks, prix et catégories dans la section Stocks.",
    emoji: "📦",
  },
  {
    icon: ShoppingCart,
    title: "Encaissez rapidement",
    description: "Vendez en quelques tapes avec la caisse intuitive.",
    emoji: "🛒",
  },
  {
    icon: BarChart3,
    title: "Analysez vos ventes",
    description: "Suivez votre chiffre d'affaires et vos performances dans Rapports.",
    emoji: "📊",
  },
  {
    icon: Settings,
    title: "Personnalisez l'app",
    description: "Thème, tables, Nom du commerce — tout se règle dans Paramètres.",
    emoji: "⚙️",
  },
];

function FeatureGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === GUIDE_STEPS.length - 1;
  const current = GUIDE_STEPS[step];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogTitle className="sr-only">Guide de prise en main</DialogTitle>

        {/* Dots */}
        <div className="flex justify-center gap-2">
          {GUIDE_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>

        {/* Contenu animé */}
        <div className="min-h-[220px] flex items-center justify-center py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="text-center space-y-4"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                {current.emoji}
              </div>
              <h2 className="text-lg font-semibold">{current.title}</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {current.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {isLast ? "Commencer" : "Passer"}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
            )}
            {!isLast && (
              <Button onClick={() => setStep((s) => s + 1)}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {isLast && (
              <Button onClick={onClose}>
                <Check className="h-4 w-4 mr-1" /> Commencer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Wizard de configuration ──────────────────────────────────────────────── */

const WIZARD_TOTAL = 7;

const ICON_MAP: Record<string, typeof Store> = {
  ShoppingBag,
  ChefHat,
  Coffee,
  Scissors,
  Shirt,
  Weight,
  Store,
};

function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [hue, setHue] = useState(PRESET_HUES[0].hue);
  const [phone, setPhone] = useState("");
  const [quarter, setQuarter] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<ClusterId | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);

  const clusterConfig = selectedCluster ? CLUSTER_MAP[selectedCluster] : null;
  const hasTables = clusterConfig?.workflow.hasTables ?? false;
  const isMagasin = selectedCluster === "magasin";

  useEffect(() => {
    const prefs = getPreferences();
    setName(prefs.workspaceName);
    setHue(prefs.hue);
    setPhone(prefs.phone);
    setQuarter(prefs.quarter);
    setOwnerName(prefs.ownerName);
  }, []);

  useEffect(() => {
    applyTheme(hue);
  }, [hue]);

  function finish() {
    savePreferences({
      workspaceName: name.trim() || getPreferences().workspaceName,
      hue,
      phone: phone.trim(),
      quarter: quarter.trim(),
      ownerName: ownerName.trim(),
      cluster: selectedCluster ?? "retail",
      subCategory: isMagasin ? (selectedSubCategory ?? undefined) : undefined,
      businessType: selectedCluster === "restaurant" ? "restaurant" : "snack",
      tablesEnabled: hasTables,
      onboarded: true,
    });
    applyTheme(hue);
    qc.invalidateQueries({ queryKey: ["preferences"] });
    onComplete();
  }

  function skip() {
    savePreferences({ onboarded: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    onComplete();
  }

  // Étape 5 = choix cluster, 5b = sous-catégorie magasin (si applicable)
  // Le total d'étapes est 7 + 1 éventuelle = 8 max
  const hasSubStep = step >= 5 && isMagasin && !selectedSubCategory;
  const effectiveStep = step;
  const WIZARD_TOTAL = isMagasin && selectedCluster && step >= 5 ? 8 : 7;

  function canNext(): boolean {
    if (step === 0) return name.trim().length > 0;
    if (step === 5) return selectedCluster !== null;
    if (step === 6 && isMagasin) return selectedSubCategory !== null;
    return true;
  }

  function goNext() {
    // Si on est à l'étape 5 et qu'on a choisi magasin, on passe à la sous-catégorie
    if (step === 5 && isMagasin && !selectedSubCategory) {
      setStep(6);
      return;
    }
    setStep((s) => s + 1);
  }

  function goPrev() {
    // Si on est à l'étape 6 et qu'on vient du cluster (magasin), on retourne à 5
    if (step === 6 && isMagasin) {
      setStep(5);
      return;
    }
    setStep((s) => s - 1);
  }

  // Sous-catégories du magasin
  const MAGASIN_SUBS: { id: SubCategory; label: string; icon: string; description: string }[] = [
    {
      id: "electronics",
      label: "Électronique",
      icon: "📱",
      description: "Téléphones, ordinateurs, accessoires. Numéros de série.",
    },
    {
      id: "appliance",
      label: "Électroménager",
      icon: "🧊",
      description: "Réfrigérateurs, cuisinières, appareils ménagers.",
    },
    {
      id: "furniture",
      label: "Meubles",
      icon: "🛋️",
      description: "Tables, chaises, armoires, canapés.",
    },
    {
      id: "hardware_store",
      label: "Quincaillerie",
      icon: "🔧",
      description: "Peinture, vis, outils. Unités : pièce, mètre, litre.",
    },
  ];

  return (
    <DialogContent
      showCloseButton={false}
      onEscapeKeyDown={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      className="sm:max-w-md"
    >
      <DialogTitle className="sr-only">Configuration de l'application</DialogTitle>

      <div className="flex gap-1">
        {Array.from({ length: WIZARD_TOTAL }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= effectiveStep ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Étape {effectiveStep + 1} sur {WIZARD_TOTAL}
      </p>

      <div className="min-h-[260px] py-2">
        {step === 0 && (
          <StepShell
            icon={Store}
            title="Nom du commerce"
            description="Comment s'appelle votre établissement ?"
          >
            <Label htmlFor="ob-name">Nom de l'entreprise</Label>
            <Input
              id="ob-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Alimentation Chez Marie"
              className="h-12 text-lg"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && canNext() && goNext()}
            />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            icon={(props) => (
              <span
                className={cn("block h-5 w-5 rounded-full", props.className)}
                style={{ backgroundColor: swatchColor(hue) }}
              />
            )}
            title="Couleur principale"
            description="Elle habille les boutons, les totaux et les graphiques."
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
            icon={Phone}
            title="Téléphone"
            description="Numéro de contact de votre commerce (optionnel)."
          >
            <Label htmlFor="ob-phone">Numéro de téléphone</Label>
            <Input
              id="ob-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : +243 81 234 5678"
              className="h-12 text-lg"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && setStep(3)}
            />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            icon={MapPin}
            title="Quartier"
            description="Où se situe votre commerce ? (optionnel)"
          >
            <Label htmlFor="ob-quarter">Quartier</Label>
            <Input
              id="ob-quarter"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              placeholder="Ex : Commune de la Gombe"
              className="h-12 text-lg"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && setStep(4)}
            />
          </StepShell>
        )}

        {step === 4 && (
          <StepShell
            icon={User}
            title="Nom du propriétaire"
            description="Qui est le propriétaire du commerce ? (optionnel)"
          >
            <Label htmlFor="ob-owner">Nom complet</Label>
            <Input
              id="ob-owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex : Marie Kabongo"
              className="h-12 text-lg"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && setStep(5)}
            />
          </StepShell>
        )}

        {step === 5 && (
          <StepShell
            icon={Store}
            title="Votre activité"
            description="Choisissez votre type de commerce. L'application s'adaptera automatiquement."
          >
            <div className="grid grid-cols-2 gap-2">
              {ACTIVE_CLUSTERS.map((c) => {
                const Icon = resolveIcon(c.icon);
                const active = selectedCluster === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCluster(c.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-all",
                      active
                        ? "border-primary bg-accent ring-1 ring-primary"
                        : "bg-card hover:border-primary/50",
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-lg p-1.5",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{c.label.split("/")[0].trim()}</span>
                  </button>
                );
              })}
            </div>
            {selectedCluster && (
              <p className="text-center text-xs text-muted-foreground">
                Mode sélectionné :{" "}
                <span className="font-medium text-foreground">{clusterConfig?.label}</span>
              </p>
            )}
          </StepShell>
        )}

        {step === 6 && isMagasin && (
          <StepShell
            icon={Store}
            title="Type de magasin"
            description="Précisez votre activité pour adapter les champs du formulaire."
          >
            <div className="grid grid-cols-2 gap-2">
              {MAGASIN_SUBS.map((sub) => {
                const active = selectedSubCategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubCategory(sub.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-all",
                      active
                        ? "border-primary bg-accent ring-1 ring-primary"
                        : "bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="text-lg">{sub.icon}</span>
                    <span className="font-medium">{sub.label}</span>
                    <span className="text-xs text-muted-foreground">{sub.description}</span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        )}

        {step === (isMagasin && selectedSubCategory ? 7 : 6) && (
          <StepShell
            icon={Check}
            title="C'est prêt"
            description="Voici ce qui est configuré. Le reste se règle dans Paramètres."
          >
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <Row label="Commerce">{name.trim() || getPreferences().workspaceName}</Row>
              <Row label="Mode">{clusterConfig?.label ?? "Épicerie"}</Row>
              {isMagasin && selectedSubCategory && (
                <Row label="Type">
                  {MAGASIN_SUBS.find((s) => s.id === selectedSubCategory)?.label}
                </Row>
              )}
              {hasTables && <Row label="Tables">Activées</Row>}
              {phone && <Row label="Téléphone">{phone}</Row>}
              {quarter && <Row label="Quartier">{quarter}</Row>}
              {ownerName && <Row label="Propriétaire">{ownerName}</Row>}
              <Row label="Couleur">
                <span
                  className="inline-block h-4 w-4 rounded-full"
                  style={{ backgroundColor: swatchColor(hue) }}
                />
              </Row>
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
            <Button variant="outline" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
          )}
          {effectiveStep < WIZARD_TOTAL - 1 ? (
            <Button onClick={goNext} disabled={!canNext()}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish}>
              <Check className="h-4 w-4 mr-1" /> Terminer
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

/* ── Composant principal ──────────────────────────────────────────────────── */

export function Onboarding() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"wizard" | "guide" | "done">("done");

  useEffect(() => {
    const prefs = getPreferences();
    if (!prefs.onboarded) {
      setPhase("wizard");
    } else if (!prefs.onboardingCompleted) {
      setPhase("guide");
    }
  }, []);

  function handleWizardComplete() {
    savePreferences({ onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setPhase("guide");
  }

  function handleGuideComplete() {
    savePreferences({ onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setPhase("done");
  }

  if (phase === "wizard") {
    return (
      <Dialog open>
        <SetupWizard onComplete={handleWizardComplete} />
      </Dialog>
    );
  }

  if (phase === "guide") {
    return <FeatureGuide onClose={handleGuideComplete} />;
  }

  return null;
}

/* ── Sous-composants ──────────────────────────────────────────────────────── */

function StepShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }> | (() => React.ReactNode);
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
