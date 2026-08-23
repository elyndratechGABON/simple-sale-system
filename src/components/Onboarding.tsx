// Assistant de premier lancement — parcours guidé intelligent :
//
// 1. **WelcomeScreen** : "Bienvenue sur ELYNDRA CAISSE" — un seul bouton "Commencer"
// 2. **SetupWizard** : nom, compte marchand (téléphone + mot de passe), secteur d'activité,
//    sous-catégorie (magasin), infos optionnelles, confidentialité
// 3. **ClusterTutorial** : tutoriel adaptatif qui ajoute des produits/prestations selon le cluster
// 4. **FirstSaleReady** : écran de confirmation "Tout est prêt"
//
// Le tutoriel (3) s'adapte au cluster choisi :
//   - retail → "Ajoutez vos produits"
//   - restaurant → "Créez votre menu"
//   - bar → "Ajoutez vos boissons" + choix workflow
//   - service → "Ajoutez vos prestations"
//   - clothing → "Ajoutez vos vêtements"
//   - weight → "Enregistrez vos produits au poids"
//   - magasin → "Ajoutez vos produits" (avec sous-cat)
//
// Les produits ajoutés pendant le tutoriel sont enregistrés en base.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  EyeOff,
  HardDrive,
  KeyRound,
  Package,
  Shield,
  Store,
  Plus,
  ArrowRight,
  PartyPopper,
  Users,
  WifiOff,
  ScanLine,
} from "lucide-react";
import { ChefHat, Coffee, Scissors, ShoppingBag, Shirt, Weight, Sparkles } from "lucide-react";
import {
  CLUSTER_MAP,
  getPreferences,
  ACTIVE_CLUSTERS,
  savePreferences,
  SUB_CATEGORY_LABELS,
  WORKFLOW_DESCRIPTIONS,
  type ClusterId,
  type SubCategory,
} from "@/lib/settings";
import { addProduct, setShopAccount, type Product } from "@/lib/db";
import { parsePairingPayload } from "@/lib/pairing";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { loadDemoData } from "@/lib/demo-data";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────────────────── */

type OnboardingPhase = "welcome" | "wizard" | "tutorial" | "ready" | "done";

/* ── Icon map ────────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, typeof Store> = {
  ShoppingBag,
  ChefHat,
  Coffee,
  Scissors,
  Shirt,
  Weight,
  Store,
  Sparkles,
};

function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}

/* ── Phase 1 : WelcomeScreen ─────────────────────────────────────────────── */

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogTitle className="sr-only">Bienvenue</DialogTitle>
        <div className="flex flex-col items-center text-center space-y-5 py-4">
          {/* Visuel de bienvenue de la marque (logo/bienvenu.png, réduit en webp). */}
          <motion.img
            src="/welcome.webp"
            alt="ELYNDRA CAISSE"
            width={560}
            height={582}
            className="w-48 h-auto rounded-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [-8, 8, -8] }}
            transition={{
              opacity: { duration: 0.5 },
              y: { duration: 3, ease: "easeInOut", repeat: Infinity },
            }}
          />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur ELYNDRA CAISSE</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Gérez vos ventes, vos stocks et votre activité depuis un seul espace, même sans
              connexion internet.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-left w-full max-w-xs">
            {[
              "Encaissez et suivez vos ventes en temps réel",
              "Gérez votre stock automatiquement",
              "Exportez vos rapports en PDF, Excel ou CSV",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <WifiOff className="h-3 w-3" /> 100% hors ligne · Vos données restent sur votre appareil
          </span>

          <Button size="lg" className="h-12 px-8 gap-2" onClick={onNext}>
            Lancer ma caisse <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-xs text-muted-foreground">Essai gratuit de 30 jours inclus</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Phase 2 : SetupWizard ───────────────────────────────────────────────── */

const MAGASIN_SUBS = Object.entries(SUB_CATEGORY_LABELS).map(([id, v]) => ({
  id: id as SubCategory,
  ...v,
}));

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quarter, setQuarter] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<ClusterId | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  // Cluster Personnalisé : domaine d'activité libre + mode de stock choisi.
  const [customDomain, setCustomDomain] = useState("");
  const [customStockChoice, setCustomStockChoice] = useState<"unit" | "weight" | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Compte marchand (v3) : un téléphone + mot de passe partagés par toutes les caisses
  // du même commerçant. « create » pour la première boutique, « join » pour rattacher
  // cet écran à un compte existant (même abonnement).
  const [accountMode, setAccountMode] = useState<"create" | "join">("create");
  const [accPhone, setAccPhone] = useState("");
  const [accPassword, setAccPassword] = useState("");
  // Propriétaire : demandé avec le compte, porté par la fiche boutique et les exports.
  const [ownerName, setOwnerName] = useState("");
  const { scanning, startScan } = useBarcodeScanner();

  /** Rattache cet écran au compte encodé dans un QR affiché par une caisse abonnée. */
  async function scanPairingQr() {
    try {
      const raw = await startScan();
      const parsed = parsePairingPayload(raw ?? "");
      if (!parsed) {
        toast.error("Ce code n'est pas un code d'appairage ELYNDRA.");
        return;
      }
      setAccPhone(parsed.phone);
      setAccPassword(parsed.password);
      if (parsed.name) setName(parsed.name);
      toast.success(`Compte « ${parsed.name || parsed.phone} » récupéré — continuez.`);
    } catch {
      toast.error("Caméra indisponible — saisissez le téléphone et le mot de passe à la main.");
    }
  }

  const clusterConfig = selectedCluster ? CLUSTER_MAP[selectedCluster] : null;
  const isMagasin = selectedCluster === "magasin";

  useEffect(() => {
    const prefs = getPreferences();
    setName(prefs.workspaceName);
    setPhone(prefs.phone);
    setQuarter(prefs.quarter);
    setOwnerName(prefs.ownerName);
  }, []);

  async function finish() {
    // Le compte est posé en base AVANT la fin de l'assistant : le premier handshake
    // (au retour en ligne) présentera ces identifiants et créera/rattachera le compte.
    await setShopAccount({
      name: name.trim() || "Ma boutique",
      phone: accPhone.trim(),
      password: accPassword,
      ownerName: ownerName.trim(),
    });
    savePreferences({
      workspaceName: name.trim() || getPreferences().workspaceName,
      phone: phone.trim(),
      quarter: quarter.trim(),
      ownerName: ownerName.trim(),
      cluster: selectedCluster ?? "retail",
      subCategory: isMagasin ? (selectedSubCategory ?? undefined) : undefined,
      customDomain: selectedCluster === "personnalise" ? customDomain.trim() : "",
      customUnitType:
        selectedCluster === "personnalise" ? (customStockChoice ?? "unit") : undefined,
      businessType: selectedCluster === "restaurant" ? "restaurant" : "snack",
      tablesEnabled: clusterConfig?.workflow.hasTables ?? false,
      onboarded: true,
      privacyAccepted,
    });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    onComplete();
  }

  // Étapes visuelles : 0=confidentialité, 1=nom, 2=compte+coordonnées, 3=secteur,
  // [4=sous-cat magasin]. Pour non-magasin : 4 étapes (0..3). Pour magasin : 5 (0..4).
  // Le step counter est toujours continu (0..totalSteps-1).
  const totalSteps = isMagasin ? 5 : 4;

  function canNext(): boolean {
    if (step === 0) return privacyAccepted;
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return accPhone.trim().length > 0 && accPassword.trim().length >= 4;
    if (step === 3) {
      if (selectedCluster === null) return false;
      if (selectedCluster === "personnalise")
        return customDomain.trim().length > 0 && customStockChoice !== null;
      return true;
    }
    if (step === 4 && isMagasin) return selectedSubCategory !== null;
    return true;
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function goPrev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // Map step number to which section renders
  function renderStep() {
    // Magasin: 0=confidentialité, 1=nom, 2=compte+coordonnées, 3=secteur, 4=sous-cat
    // Non-magasin: 0=confidentialité, 1=nom, 2=compte+coordonnées, 3=secteur
    return step;
  }

  return (
    <DialogContent
      showCloseButton={false}
      onEscapeKeyDown={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      className="sm:max-w-md"
    >
      <DialogTitle className="sr-only">Configuration de votre boutique</DialogTitle>

      {/* Barre de progression */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
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
        Étape {step + 1} sur {totalSteps}
      </p>

      <div className="min-h-[260px] py-2">
        {/* Étape 0 : Confidentialité */}
        {step === 0 && (
          <StepShell
            icon={Shield}
            title="Confidentialité"
            description="Vos données restent entre vos mains."
          >
            <div className="space-y-4">
              {/* Visuel « Confidentialité » de la marque (logo/CONFIDENCE.png, réduit
                  en webp), à la place de l'icône bouclier seule. */}
              <motion.img
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                src="/confidence.webp"
                alt="Confidentialité"
                width={560}
                height={560}
                className="mx-auto max-h-40 w-auto rounded-xl"
              />
              <ul className="space-y-2.5 text-sm">
                {[
                  { icon: HardDrive, text: "100% local — tout vit sur votre appareil" },
                  { icon: CloudOff, text: "Aucun envoi vers nos serveurs sans votre accord" },
                  { icon: EyeOff, text: "Pas de tracking, pas de collecte de données" },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5">
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2 pt-3">
              <Checkbox
                id="privacy-accept"
                checked={privacyAccepted}
                onCheckedChange={(v) => setPrivacyAccepted(Boolean(v))}
              />
              <Label htmlFor="privacy-accept" className="cursor-pointer text-sm">
                J'accepte que mes données soient utilisées pour améliorer l'application.
              </Label>
            </div>
          </StepShell>
        )}

        {/* Étape 1 : Nom du commerce */}
        {step === 1 && (
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

        {/* Étape 2 : Compte marchand */}
        {step === 2 && (
          <StepShell
            icon={Users}
            title="Compte marchand"
            description="Un seul compte pour toutes vos caisses, un seul abonnement."
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "create" as const,
                  title: "Créer un compte",
                  desc: "Première boutique — essai gratuit 30 jours",
                },
                {
                  id: "join" as const,
                  title: "Rejoindre",
                  desc: "Rattacher cette caisse à un compte existant",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setAccountMode(m.id);
                    // Rejoindre un compte existant = flasher le QR affiché par une
                    // caisse déjà abonnée. La saisie manuelle reste en secours sous
                    // le bouton de re-scan si la caméra est indisponible.
                    if (m.id === "join") void scanPairingQr();
                  }}
                  aria-pressed={accountMode === m.id}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-all",
                    accountMode === m.id
                      ? "border-primary bg-accent ring-1 ring-primary"
                      : "bg-card hover:border-primary/50",
                  )}
                >
                  <span className="font-medium">{m.title}</span>
                  <span className="text-xs text-muted-foreground">{m.desc}</span>
                </button>
              ))}
            </div>
            <div className="space-y-3 pt-1">
              {accountMode === "join" && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={scanning}
                  onClick={() => void scanPairingQr()}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  {scanning ? "Caméra active…" : "Scanner le QR d'une autre caisse"}
                </Button>
              )}
              <div>
                <Label htmlFor="ob-owner">Nom du propriétaire</Label>
                <Input
                  id="ob-owner"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ex : Marie Kabongo"
                  className="h-12"
                />
              </div>
              <div>
                <Label htmlFor="ob-acc-phone">Téléphone du compte</Label>
                <Input
                  id="ob-acc-phone"
                  type="tel"
                  value={accPhone}
                  onChange={(e) => setAccPhone(e.target.value)}
                  placeholder="Ex : +241 06 123 456"
                  className="h-12"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="ob-acc-pass">Mot de passe</Label>
                <Input
                  id="ob-acc-pass"
                  type="password"
                  value={accPassword}
                  onChange={(e) => setAccPassword(e.target.value)}
                  placeholder={
                    accountMode === "join" ? "Mot de passe du compte" : "4 caractères minimum"
                  }
                  className="h-12"
                />
              </div>
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Coordonnées du commerce (optionnel)
                </p>
                <div>
                  <Label htmlFor="ob-phone">Numéro de téléphone</Label>
                  <Input
                    id="ob-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex : +241 06 123 456"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="ob-quarter">Quartier</Label>
                  <Input
                    id="ob-quarter"
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    placeholder="Ex : Owendo"
                    className="h-12"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {accountMode === "create"
                ? "Paliers : 10 000 F (2 appareils) · 25 000 F (4) · 50 000 F (8) / 30 jours. Vous démarrez avec un essai gratuit."
                : "Scannez le QR affiché par une de vos caisses abonnées, ou saisissez son téléphone et mot de passe."}
            </p>
          </StepShell>
        )}

        {/* Étape 3 : Secteur d'activité */}
        {step === 3 && (
          <StepShell
            icon={Store}
            title="Quel type d'activité gérez-vous ?"
            description="Choisissez votre secteur. L'application s'adaptera automatiquement."
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
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-sm transition-all",
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
                    <span className="font-medium text-xs leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedCluster && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                <span className="font-medium text-foreground">{clusterConfig?.label}</span> —{" "}
                {WORKFLOW_DESCRIPTIONS[clusterConfig?.workflowType ?? "direct"]?.title}
              </p>
            )}

            {/* Cluster Personnalisé : domaine libre + mode de stock */}
            {selectedCluster === "personnalise" && (
              <div className="space-y-3 rounded-xl border bg-accent/40 p-3 mt-2">
                <div>
                  <Label htmlFor="ob-custom-domain">Votre domaine d'activité</Label>
                  <Input
                    id="ob-custom-domain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="Ex : Vente de pièces détachées, Photocopie…"
                    className="h-11"
                    autoFocus
                  />
                </div>
                <div>
                  <Label>Comment gérez-vous votre stock ?</Label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      {
                        id: "unit" as const,
                        title: "Stock normal",
                        desc: "À l'unité / à la pièce",
                      },
                      {
                        id: "weight" as const,
                        title: "Stock au kilo",
                        desc: "Vente et stock en kg",
                      },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCustomStockChoice(m.id)}
                        aria-pressed={customStockChoice === m.id}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-all",
                          customStockChoice === m.id
                            ? "border-primary bg-accent ring-1 ring-primary"
                            : "bg-card hover:border-primary/50",
                        )}
                      >
                        <span className="font-medium">{m.title}</span>
                        <span className="text-xs text-muted-foreground">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </StepShell>
        )}

        {/* Étape 4 : Sous-catégorie magasin (conditionnel) */}
        {step === 4 && isMagasin && (
          <StepShell
            icon={Store}
            title="Type de magasin"
            description="Précisez votre activité pour adapter les champs."
          >
            <div className="grid grid-cols-2 gap-2">
              {MAGASIN_SUBS.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubCategory(sub.id)}
                  aria-pressed={selectedSubCategory === sub.id}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-all",
                    selectedSubCategory === sub.id
                      ? "border-primary bg-accent ring-1 ring-primary"
                      : "bg-card hover:border-primary/50",
                  )}
                >
                  <span className="text-lg">{sub.emoji}</span>
                  <span className="font-medium">{sub.label}</span>
                  <span className="text-xs text-muted-foreground">{sub.description}</span>
                </button>
              ))}
            </div>
          </StepShell>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            savePreferences({ onboarded: true });
            qc.invalidateQueries({ queryKey: ["preferences"] });
            onComplete();
          }}
        >
          Passer
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button onClick={goNext} disabled={!canNext()}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canNext()}>
              <Check className="h-4 w-4 mr-1" /> Terminer
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

/* ── Phase 3 : ClusterTutorial ───────────────────────────────────────────── */

type TutorialStep = "confirm" | "add" | "done";

function ClusterTutorial({ onComplete }: { onComplete: () => void }) {
  const prefs = getPreferences();
  const cluster = prefs.cluster;
  const config = CLUSTER_MAP[cluster];
  // Personnalisé + stock au kilo = même comportement que le cluster boucherie.
  const sellsByWeight =
    cluster === "weight" || (cluster === "personnalise" && prefs.customUnitType === "weight");

  const [subStep, setSubStep] = useState<TutorialStep>("confirm");
  const [addedCount, setAddedCount] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Formulaire produit
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productCategory, setProductCategory] = useState("");

  // Configuration du tutoriel selon le cluster
  const tutorialConfig = getTutorialConfig(cluster, prefs.subCategory);

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      const count = await loadDemoData(cluster, prefs.subCategory);
      setAddedCount((c) => c + count);
      toast.success(`${count} produits de démo chargés`);
      setSubStep("done");
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoadingDemo(false);
    }
  }

  async function handleAddProduct() {
    if (!productName.trim() || !productPrice.trim()) return;

    await addProduct({
      name: productName.trim(),
      barcode: "",
      price: Number(productPrice) || 0,
      cost: 0,
      category: productCategory.trim() || tutorialConfig.defaultCategory,
      stock: Number(productStock) || 0,
      type: tutorialConfig.isService ? "service" : "product",
      unit: "piece",
      unitType: sellsByWeight ? "weight" : "unit",
      weightUnit: sellsByWeight ? "kg" : undefined,
      serialNumber: undefined,
      expiryDate: undefined,
    });
    setAddedCount((c) => c + 1);
    setProductName("");
    setProductPrice("");
    setProductStock("");
    setProductCategory("");
  }

  // Confirmation
  if (subStep === "confirm") {
    return (
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="sm:max-w-md"
        >
          <DialogTitle className="sr-only">Votre boutique est prête</DialogTitle>
          <div className="min-h-[300px] flex flex-col items-center justify-center text-center space-y-6 py-4">
            {/* Visuel « Boutique prête » de la marque (logo/Boutique prete.png, réduit
                en webp), à la place de l'icône confettis seule. */}
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              src="/shop-ready.webp"
              alt="Boutique prête"
              width={560}
              height={373}
              className="w-full max-w-[280px] h-auto rounded-xl"
            />
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Votre boutique est prête !</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {tutorialConfig.welcomeMessage}
              </p>
            </div>
            <Button size="lg" className="gap-2" onClick={() => setSubStep("add")}>
              {tutorialConfig.ctaLabel} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Ajout de produits
  if (subStep === "add") {
    return (
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="sm:max-w-md"
        >
          <DialogTitle className="sr-only">{tutorialConfig.addTitle}</DialogTitle>
          <div className="space-y-4 py-2">
            <StepShell
              icon={Package}
              title={tutorialConfig.addTitle}
              description={tutorialConfig.addDescription}
            >
              <div className="space-y-3">
                <div>
                  <Label htmlFor="tut-name">{tutorialConfig.productLabel}</Label>
                  <Input
                    id="tut-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder={tutorialConfig.productPlaceholder}
                    className="h-11"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tut-price">Prix de vente (FCFA)</Label>
                    <Input
                      id="tut-price"
                      inputMode="numeric"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value.replace(/\D/g, ""))}
                      placeholder="0"
                      className="h-11"
                    />
                  </div>
                  {!tutorialConfig.isService && (
                    <div>
                      <Label htmlFor="tut-stock">{sellsByWeight ? "Stock (kg)" : "Stock"}</Label>
                      <Input
                        id="tut-stock"
                        inputMode="numeric"
                        value={productStock}
                        onChange={(e) => setProductStock(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        className="h-11"
                      />
                    </div>
                  )}
                </div>
                {tutorialConfig.showCategory && (
                  <div>
                    <Label htmlFor="tut-cat">Catégorie</Label>
                    <Input
                      id="tut-cat"
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      placeholder={tutorialConfig.categoryPlaceholder}
                      className="h-11"
                    />
                  </div>
                )}
              </div>
            </StepShell>

            {addedCount > 0 && (
              <p className="text-center text-sm text-primary font-medium">
                ✓ {addedCount} {addedCount === 1 ? "produit ajouté" : "produits ajoutés"}
              </p>
            )}

            <Button
              variant="default"
              size="lg"
              className="w-full gap-2"
              onClick={handleLoadDemo}
              disabled={loadingDemo}
            >
              {loadingDemo ? (
                "Chargement…"
              ) : (
                <>
                  <Package className="h-4 w-4" /> Charger les produits de démo
                </>
              )}
            </Button>

            <div className="flex items-center justify-between gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => setSubStep("done")}>
                {addedCount > 0 ? "J'ai terminé" : "Passer"}
              </Button>
              <Button
                onClick={handleAddProduct}
                disabled={!productName.trim() || !productPrice.trim()}
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Done
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogTitle className="sr-only">Tout est prêt</DialogTitle>
        <div className="min-h-[300px] flex flex-col items-center justify-center text-center space-y-6 py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <PartyPopper className="h-8 w-8 text-primary" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Tout est prêt !</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {addedCount > 0
                ? `${addedCount} ${addedCount === 1 ? "produit enregistré" : "produits enregistrés"}. Votre boutique "${prefs.workspaceName}" est prête à vendre.`
                : `Votre boutique "${prefs.workspaceName}" est configurée. Vous pourrez ajouter vos produits plus tard.`}
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={onComplete}>
            {tutorialConfig.finalCtaLabel} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Configuration du tutoriel par cluster ───────────────────────────────── */

function getTutorialConfig(cluster: ClusterId, subCategory?: SubCategory) {
  const base = {
    defaultCategory: "",
    productLabel: "Nom du produit",
    productPlaceholder: "Ex : Regab",
    categoryPlaceholder: "Ex : Boissons",
    showCategory: true,
    isService: false,
  };

  switch (cluster) {
    case "restaurant":
      return {
        ...base,
        welcomeMessage: "Maintenant, configurons votre espace de vente. Commençons par votre menu.",
        ctaLabel: "Créer mon menu",
        addTitle: "Ajoutez un plat ou une boisson",
        addDescription: "Nom, prix et catégorie. Vous pourrez en ajouter d'autres ensuite.",
        productLabel: "Nom du plat ou de la boisson",
        productPlaceholder: "Ex : Poulet braisé",
        categoryPlaceholder: "Ex : Plats, Boissons, Desserts",
        finalCtaLabel: "Enregistrer ma première commande",
      };
    case "bar":
      return {
        ...base,
        welcomeMessage: "Ajoutez vos boissons pour commencer à encaisser.",
        ctaLabel: "Ajouter mes boissons",
        addTitle: "Ajoutez une boisson",
        addDescription: "Nom, prix et catégorie (Bières, Vins, Spiritueux...).",
        productLabel: "Nom de la boisson",
        productPlaceholder: "Ex : Regab 33cl",
        categoryPlaceholder: "Ex : Bières, Vins, Spiritueux",
        finalCtaLabel: "Commencer à vendre",
      };
    case "service":
      return {
        ...base,
        welcomeMessage: "Ajoutez les prestations que vous proposez à vos clients.",
        ctaLabel: "Ajouter mes prestations",
        addTitle: "Ajoutez une prestation",
        addDescription: "Nom et prix de la prestation.",
        productLabel: "Nom de la prestation",
        productPlaceholder: "Ex : Coupe homme",
        showCategory: false,
        isService: true,
        finalCtaLabel: "Enregistrer ma première prestation",
      };
    case "clothing":
      return {
        ...base,
        welcomeMessage: "Ajoutez vos vêtements et accessoires.",
        ctaLabel: "Ajouter mes produits",
        addTitle: "Ajoutez un vêtement ou accessoire",
        addDescription: "Nom, prix et catégorie.",
        productLabel: "Nom du produit",
        productPlaceholder: "Ex : Pagne wax",
        categoryPlaceholder: "Ex : Vêtements, Accessoires, Chaussures",
        finalCtaLabel: "Faire ma première vente",
      };
    case "weight":
      return {
        ...base,
        welcomeMessage: "Enregistrez vos produits et leurs prix au kilogramme.",
        ctaLabel: "Ajouter mes produits",
        addTitle: "Ajoutez un produit",
        addDescription: "Nom, prix au kg et stock initial.",
        productLabel: "Nom du produit",
        productPlaceholder: "Ex : Viande de bœuf",
        categoryPlaceholder: "Ex : Viandes, Poissons",
        finalCtaLabel: "Faire ma première vente",
      };
    case "magasin":
      return {
        ...base,
        welcomeMessage: `Ajoutez vos produits${subCategory ? ` (${SUB_CATEGORY_LABELS[subCategory]?.label})` : ""}.`,
        ctaLabel: "Ajouter mes produits",
        addTitle: "Ajoutez un produit",
        addDescription: "Nom, prix et stock.",
        productLabel: "Nom du produit",
        productPlaceholder: subCategory === "electronics" ? "Ex : iPhone 15" : "Ex : Canapé cuir",
        categoryPlaceholder: "Ex : Électronique, Meubles",
        finalCtaLabel: "Faire ma première vente",
      };
    case "retail":
    default:
      return {
        ...base,
        welcomeMessage: "Ajoutez les produits que vous avez actuellement en boutique.",
        ctaLabel: "Ajouter mes produits",
        addTitle: "Ajoutez un produit",
        addDescription: "Nom, prix de vente et stock initial.",
        productLabel: "Nom du produit",
        productPlaceholder: "Ex : Regab, Sucre, Huile",
        categoryPlaceholder: "Ex : Alimentation, Boissons",
        finalCtaLabel: "Faire ma première vente",
      };
  }
}

/* ── Composant principal ──────────────────────────────────────────────────── */

export function Onboarding() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<OnboardingPhase>("done");

  useEffect(() => {
    const prefs = getPreferences();
    if (!prefs.onboarded) {
      setPhase("welcome");
    } else if (!prefs.onboardingCompleted) {
      setPhase("tutorial");
    }
  }, []);

  function handleWelcomeNext() {
    setPhase("wizard");
  }

  function handleWizardComplete() {
    setPhase("tutorial");
  }

  function handleTutorialComplete() {
    savePreferences({ onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setPhase("done");
  }

  if (phase === "welcome") {
    return <WelcomeScreen onNext={handleWelcomeNext} />;
  }

  if (phase === "wizard") {
    return (
      <Dialog open>
        <SetupWizard onComplete={handleWizardComplete} />
      </Dialog>
    );
  }

  if (phase === "tutorial") {
    return <ClusterTutorial onComplete={handleTutorialComplete} />;
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
