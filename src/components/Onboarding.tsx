// Assistant de premier lancement. Ne s'affiche qu'UNE fois : le drapeau `onboarded`
// est écrit dans localStorage à la sortie, quel que soit le chemin de sortie (terminé
// ou passé). Aucune étape n'est bloquante — un commerçant qui ouvre l'application pour
// encaisser tout de suite doit pouvoir le faire.
//
// Sept étapes séquentielles (1 champ par écran) : nom → couleur → téléphone → quartier
// → propriétaire → type de produit(s) → confirmation. Le cluster est DÉDUIT des produits
// sélectionnés, pas choisi directement.
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, MapPin, Phone, Store, User } from "lucide-react";
import { ChefHat, Coffee, Scissors, ShoppingBag, Shirt, Weight, Wrench } from "lucide-react";
import {
  applyTheme,
  CLUSTER_MAP,
  getPreferences,
  inferCluster,
  PRESET_HUES,
  PRODUCT_TYPES,
  savePreferences,
  swatchColor,
  type ClusterId,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 7;

/** Résout le nom d'icône (string) en composant Lucide réel. */
const ICON_MAP: Record<string, typeof Store> = {
  ShoppingBag,
  ChefHat,
  Coffee,
  Scissors,
  Shirt,
  Weight,
  Wrench,
};

function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}

export function Onboarding() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Champs
  const [name, setName] = useState("");
  const [hue, setHue] = useState(PRESET_HUES[0].hue);
  const [phone, setPhone] = useState("");
  const [quarter, setQuarter] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Cluster déduit des types sélectionnés
  const cluster: ClusterId = useMemo(() => inferCluster(selectedTypes), [selectedTypes]);
  const clusterConfig = CLUSTER_MAP[cluster];
  const hasTables = clusterConfig.workflow.hasTables;

  useEffect(() => {
    const prefs = getPreferences();
    setName(prefs.workspaceName);
    setHue(prefs.hue);
    setPhone(prefs.phone);
    setQuarter(prefs.quarter);
    setOwnerName(prefs.ownerName);
    if (!prefs.onboarded) setOpen(true);
  }, []);

  useEffect(() => {
    if (open) applyTheme(hue);
  }, [hue, open]);

  function toggleType(typeId: string) {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId],
    );
  }

  function finish() {
    savePreferences({
      workspaceName: name.trim() || getPreferences().workspaceName,
      hue,
      phone: phone.trim(),
      quarter: quarter.trim(),
      ownerName: ownerName.trim(),
      cluster,
      businessType: cluster === "restaurant" ? "restaurant" : "snack",
      tablesEnabled: hasTables,
      onboarded: true,
    });
    applyTheme(hue);
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setOpen(false);
  }

  function skip() {
    savePreferences({ onboarded: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setOpen(false);
  }

  function canNext(): boolean {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 5:
        return selectedTypes.length > 0;
      default:
        return true;
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogTitle className="sr-only">Configuration de l'application</DialogTitle>

        {/* Barre de progression fine */}
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Étape {step + 1} sur {TOTAL_STEPS}
        </p>

        <div className="min-h-[260px] py-2">
          {/* Étape 0 : Nom du commerce */}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canNext()) setStep(1);
                }}
              />
            </StepShell>
          )}

          {/* Étape 1 : Couleur */}
          {step === 1 && (
            <StepShell
              icon={(props) => (
                <span
                  className={cn("block h-5 w-5 rounded-full", props.className)}
                  style={{ backgroundColor: swatchColor(hue) }}
                />
              )}
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

          {/* Étape 2 : Téléphone */}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") setStep(3);
                }}
              />
            </StepShell>
          )}

          {/* Étape 3 : Quartier */}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") setStep(4);
                }}
              />
            </StepShell>
          )}

          {/* Étape 4 : Nom du propriétaire */}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") setStep(5);
                }}
              />
            </StepShell>
          )}

          {/* Étape 5 : Que vendez-vous ? (multi-select → déduit le cluster) */}
          {step === 5 && (
            <StepShell
              icon={ShoppingBag}
              title="Que vendez-vous ?"
              description="Sélectionnez tout ce que vous proposez. L'application s'adaptera automatiquement."
            >
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_TYPES.map((pt) => {
                  const Icon = resolveIcon(pt.icon);
                  const active = selectedTypes.includes(pt.id);
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => toggleType(pt.id)}
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
                      <span className="font-medium">{pt.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedTypes.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Mode détecté :{" "}
                  <span className="font-medium text-foreground">{clusterConfig.label}</span>
                </p>
              )}
            </StepShell>
          )}

          {/* Étape 6 : Confirmation */}
          {step === 6 && (
            <StepShell
              icon={Check}
              title="C'est prêt"
              description="Voici ce qui est configuré. Le reste se règle dans Paramètres."
            >
              <div className="space-y-2 rounded-lg border p-4 text-sm">
                <Row label="Commerce">{name.trim() || getPreferences().workspaceName}</Row>
                <Row label="Mode">{clusterConfig.label}</Row>
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
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
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
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                          */
/* -------------------------------------------------------------------------- */

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
