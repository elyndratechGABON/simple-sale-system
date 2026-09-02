// Assistant de premier lancement — parcours guidé intelligent, rendu dans la
// ROUTE DÉDIÉE /welcome (page indépendante : aucun chrome applicatif derrière).
//
// 1. **SetupWizard** : confidentialité, nom, compte marchand (téléphone + mot de
//    passe, ou scan du QR d'une caisse abonnée), secteur d'activité, sous-catégorie
// 2. **ClusterTutorial** : tutoriel adaptatif qui ajoute des produits/prestations selon le cluster
//
// Le tutoriel s'adapte au cluster choisi :
//   - retail → "Ajoutez vos produits"   - restaurant → "Créez votre menu"
//   - bar → "Ajoutez vos boissons"      - service → "Ajoutez vos prestations"
//   - clothing → "Ajoutez vos vêtements" - weight → "Produits au poids"
//   - magasin → "Ajoutez vos produits" (avec sous-cat)
//
// Les produits ajoutés pendant le tutoriel sont enregistrés en base.
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  EyeOff,
  HardDrive,
  Package,
  Shield,
  Store,
  Plus,
  ArrowRight,
  PartyPopper,
  Users,
  ScanLine,
} from "lucide-react";
import {
  ChefHat,
  Coffee,
  KeyRound,
  Scissors,
  ShoppingBag,
  Shirt,
  Weight,
  Sparkles,
} from "lucide-react";
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
import { joinByKeyword } from "@/lib/gatekeeper";
import { parsePairingPayload, applyPairingShop } from "@/lib/pairing";
import { enterPairingCode } from "@/lib/syncengine/pairing";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { loadDemoData } from "@/lib/demo-data";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────────────────── */

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
  KeyRound,
};

function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}

/* ── Phase 1 : SetupWizard ───────────────────────────────────────────────── */

const MAGASIN_SUBS = Object.entries(SUB_CATEGORY_LABELS).map(([id, v]) => ({
  id: id as SubCategory,
  ...v,
}));

export function SetupWizard({
  onComplete,
  initialAccountMode = "create",
  initialCredentials,
  initialPairCode,
  initialCluster,
  initialStep,
}: {
  onComplete: () => void;
  /** « join » = arrivée via « Se connecter » : le wizard démarre directement sur
   *  l'étape du nom d'enseigne avec le compte en mode rattachement (scan QR ou
   *  saisie). La case confidentialité reste atteignable via « Retour ». */
  initialAccountMode?: "create" | "join";
  /** Identifiants recueillis par un scan QR AVANT l'ouverture du wizard (bouton
   *  « Rejoindre via code QR » de l'écran de bienvenue) : pré-remplis. */
  initialCredentials?: { phone: string; password: string } | null;
  /** Code de confirmation TEMPORAIRE transporté par le QR scanné AVANT le wizard.
   *  Le téléphone s'annonce avec lui au moment de terminer l'assistant : le principal
   *  le reconnaît et les données convergent. */
  initialPairCode?: string;
  /** Type d'activité (cluster) ressorti d'un scan QR AVANT le wizard : présélectionné
   *  à l'étape secteur, au lieu de le redemander. */
  initialCluster?: string;
  /** Étape de départ. Un scan QR pré-remplit boutique ET identifiants : on saute
   *  directement à l'étape compte (saisie du code temporaire) au lieu de redemander
   *  le nom d'enseigne. */
  initialStep?: number;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState(initialStep ?? (initialAccountMode === "join" ? 1 : 0));

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quarter, setQuarter] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<ClusterId | null>(() => {
    if (typeof initialCluster === "string" && initialCluster in CLUSTER_MAP) {
      return initialCluster as ClusterId;
    }
    return null;
  });
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  // Cluster Personnalisé : domaine d'activité libre + mode de stock choisi.
  const [customDomain, setCustomDomain] = useState("");
  const [customStockChoice, setCustomStockChoice] = useState<"unit" | "weight" | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Compte marchand (v3) : un téléphone + mot de passe partagés par toutes les caisses
  // du même commerçant. « create » pour la première boutique, « join » pour rattacher
  // cet écran à un compte existant (même abonnement).
  const [accountMode, setAccountMode] = useState<"create" | "join">(initialAccountMode);
  const [accPhone, setAccPhone] = useState(initialCredentials?.phone ?? "");
  const [accPassword, setAccPassword] = useState(initialCredentials?.password ?? "");
  // Code de confirmation temporaire : l'utilisateur DOIT le saisir sur ce téléphone
  // (il est affiché en grand sur la caisse principale). Il devient la preuve de son
  // appairage auprès du principal à la fin de l'assistant (sinon les données ne
  // convergeraient jamais entre les deux caisses).
  const [pairCode, setPairCode] = useState(initialPairCode ?? "");
  // QR scanné : suit que le compte/boutique provient d'un scan (téléphone+mot de passe
  // pré-remplis). Initialisé à vrai quand les identifiants arrivent d'un scan faît AVANT
  // le wizard (bouton « Rejoindre via code QR » de l'écran de bienvenue). Tant qu'un QR
  // a été scanné, la saisie du code temporaire est EXIGÉE avant de pouvoir continuer —
  // même si les identifiants sont déjà remplis.
  const [qrScanned, setQrScanned] = useState(Boolean(initialCredentials));
  // Mot clé de récupération (v3) : alternative au téléphone+mot de passe pour rattacher
  // un écran au compte — utilisé quand les identifiants du compte sont perdus.
  const [accKeyword, setAccKeyword] = useState("");
  // Propriétaire : demandé avec le compte, porté par la fiche boutique et les exports.
  const [ownerName, setOwnerName] = useState("");
  const { scanning, startScan } = useBarcodeScanner();

  /** Rattache cet écran au compte encodé dans un QR affiché par une caisse abonnée. */
  async function scanPairingQr() {
    try {
      const raw = await startScan();
      if (raw === null) return;
      const parsed = parsePairingPayload(raw);
      if (!parsed) {
        toast.error("Ce code n'est pas un code d'appairage ELYNDRA.");
        return;
      }
      setAccPhone(parsed.phone);
      setAccPassword(parsed.password);
      setQrScanned(true);
      // Copie intégrale de la boutique scannée : fiche (profil+préférences) ET état de
      // l'assistant (identité + type de boutique). La nouvelle caisse s'ouvre identique ;
      // l'utilisateur garde la main pour corriger avant de terminer.
      const applied = await applyPairingShop(parsed.shop);
      if (parsed.shop) {
        setName(parsed.shop.storeName ?? "");
        setOwnerName(parsed.shop.ownerName ?? "");
        setPhone(parsed.shop.phone ?? "");
        setQuarter(parsed.shop.quarter ?? "");
        if (parsed.shop.cluster) {
          setSelectedCluster(parsed.shop.cluster);
          setSelectedSubCategory(parsed.shop.subCategory ?? null);
          setCustomDomain(parsed.shop.customDomain ?? "");
          setCustomStockChoice(parsed.shop.customUnitType ?? null);
        }
      }
      toast.success(
        applied
          ? `Compte « ${parsed.name || parsed.phone} » récupéré — copie de la boutique appliquée, continuez.`
          : `Compte « ${parsed.name || parsed.phone} » récupéré — continuez.`,
      );
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
    const store = name.trim() || "Ma boutique";
    const owner = ownerName.trim();

    // Voie « mot clé » (jonction sans téléphone/mot de passe) : la vérification est
    // portée par le serveur. Hors ligne → mode provisoire 48 h (claim + bannière) ;
    // mot clé rejeté → blocage dur, on NE termine PAS l'assistant.
    if (accountMode === "join" && accKeyword.trim() && !(accPhone.trim() && accPassword)) {
      await setShopAccount({ name: store, phone: "", password: "", ownerName: owner });
      const result = await joinByKeyword({
        storeName: store,
        ownerName: owner,
        keyword: accKeyword.trim(),
      });
      if (result.status === "blocked") {
        toast.error(
          "Mot clé invalide : aucun compte ne correspond à ce nom, ce propriétaire et ce mot clé.",
        );
        setAccKeyword("");
        return;
      }
      if (result.status === "pending") {
        toast.info(
          "Serveur injoignable — la vérification reprendra automatiquement au retour du réseau (48 h max).",
        );
      }
    } else {
      await setShopAccount({
        name: store,
        phone: accPhone.trim(),
        password: accPassword,
        ownerName: owner,
      });
    }

    // Jonction via QR : le compte (téléphone+mot de passe) vient d'être posé → le groupe
    // de partage P2P (`s_`) existe maintenant. On s'annonce avec le code de confirmation
    // temporaire lu dans le QR : le principal le reconnaît `paired` d'office et les
    // données (produits, ventes, stock) convergent au prochain échange P2P.
    if (pairCode && accPhone.trim() && accPassword) {
      const pairing = await enterPairingCode(pairCode).catch(() => "invalid" as const);
      if (pairing === "invalid") {
        toast.warning("Compte créé, mais le code temporaire n'a pas été accepté.", {
          description:
            "Rejoignez l'autre caisse dans Réglages → Appareils avec le bon code (6 caractères).",
        });
      }
    }

    savePreferences({
      workspaceName: store,
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
    if (step === 2) {
      // QR scanné → le compte/boutique sont déjà pré-remplis, mais le code temporaire
      // affiché sur la caisse principale reste À SAISIR : on bloque tant qu'il n'est pas là.
      if (accountMode === "join" && qrScanned) return pairCode.trim().length >= 6;
      // Jonction par mot clé : les identifiants téléphone/mdp ne sont plus exigés.
      if (accountMode === "join" && accKeyword.trim() && !(accPhone.trim() && accPassword)) {
        return accKeyword.trim().replace(/\s/g, "").length >= 8;
      }
      return accPhone.trim().length > 0 && accPassword.trim().length >= 4;
    }
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
    // CARTE DE PAGE (plus aucun Dialog) : ce composant vit dans la route /welcome,
    // pleine page indépendante — rien de l'application ne peut apparaître derrière.
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 text-left shadow-sm sm:p-6">
      <h1 className="sr-only">Configuration de votre boutique</h1>

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
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Étape {step + 1} sur {totalSteps}
      </p>

      {/* Hauteur minimale bornée : les étapes du wizard restent stables d'un
          écran à l'autre sans exiger 260px de haut sur un téléphone couché. */}
      <div className="min-h-[min(260px,40dvh)] py-2">
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
                    // Sélection SILENCIEUSE : la caméra n'est JAMAIS armée depuis le
                    // choix de la tuile. Les navigateurs mobiles (Safari iOS en
                    // tête) n'accordent getUserMedia que dans la fenêtre d'activation
                    // qui suit un geste — et un prompt d'autorisation qui surgit sur
                    // un simple choix de mode surprend et se fait refuser. L'activation
                    // passe par le bouton « Scanner » dédié ci-dessous : UN geste
                    // clair = UN prompt, au moment où l'utilisateur l'attend.
                    if (m.id !== accountMode) setQrScanned(false);
                    setAccountMode(m.id);
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
                <>
                  {/* Chemin PRIMAIRE du rattachement : ce mobile est nouveau, le QR
                      affiché par une caisse déjà abonnée est ce qu'on lui DEMANDE.
                      La caméra ne s'arme que sur ce bouton (geste dédié = prompt
                      d'autorisation au bon moment) ; la saisie manuelle reste en
                      dessous comme repli explicite. */}
                  <div className="space-y-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center">
                    <ScanLine className="mx-auto h-8 w-8 text-primary" />
                    <p className="text-sm font-medium">
                      Scannez le QR affiché par votre caisse déjà abonnée
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sur l'autre téléphone : Réglages → Appareils → « Ajouter un appareil », puis
                      présentez le code ici.
                    </p>
                    <Button
                      type="button"
                      className="h-12 w-full"
                      disabled={scanning}
                      onClick={() => void scanPairingQr()}
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      {scanning ? "Caméra active…" : "Scanner le QR maintenant"}
                    </Button>
                  </div>
                  <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <KeyRound className="h-4 w-4 shrink-0 text-primary" />
                      Saisissez le code temporaire affiché sur votre caisse principale
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sur l'autre téléphone : Réglages → Appareils → « Ajouter un appareil ». Le
                      code est affiché en grand, valable 10 minutes.
                    </p>
                    <Input
                      id="ob-pair-code"
                      value={pairCode}
                      onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                      placeholder="Code sur l'autre caisse"
                      className="h-12 font-mono tracking-widest"
                      maxLength={6}
                      autoComplete="off"
                      autoFocus={qrScanned}
                    />
                  </div>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-background px-2 text-xs uppercase tracking-wide text-muted-foreground">
                        ou saisir manuellement
                      </span>
                    </div>
                  </div>
                </>
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
              {accountMode === "join" && (
                <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Téléphone perdu, ou plus de mot de passe ? Rejoignez avec le mot clé reçu à la
                    création du compte.
                  </p>
                  <div>
                    <Label htmlFor="ob-acc-keyword">Mot clé de récupération</Label>
                    <Input
                      id="ob-acc-keyword"
                      value={accKeyword}
                      onChange={(e) => setAccKeyword(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX"
                      className="h-12 font-mono tracking-widest"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Le mot clé n'est affiché qu'à la création du compte — conservez-le
                    précieusement.
                  </p>
                </div>
              )}
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
            {selectedCluster && clusterConfig && (
              /* Carte de confirmation PERSONNALISÉE : le libellé, la description et les
                 étapes du workflow sont ceux du cluster choisi — l'utilisateur voit dès ici
                 ce que l'application fera pour lui (coiffure → "réalisez la prestation",
                 boucherie → "saisissez le poids"…). */
              <div className="mt-2 space-y-2 rounded-xl border bg-accent/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{clusterConfig.label}</p>
                <p>{clusterConfig.description}</p>
                <p className="flex flex-wrap gap-1">
                  {(WORKFLOW_DESCRIPTIONS[clusterConfig.workflowType]?.steps ?? []).map((s, i) => (
                    <span
                      key={s}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {i + 1}. {s}
                    </span>
                  ))}
                </p>
              </div>
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
    </div>
  );
}

/* ── Phase 2 : ClusterTutorial ───────────────────────────────────────────── */

type TutorialStep = "confirm" | "add" | "done";

export function ClusterTutorial({ onComplete }: { onComplete: () => void }) {
  const prefs = getPreferences();
  const cluster = prefs.cluster;
  const config = CLUSTER_MAP[cluster];
  // Personnalisé + stock au kilo = même comportement que le cluster boucherie.
  const sellsByWeight =
    cluster === "weight" || (cluster === "personnalise" && prefs.customUnitType === "weight");

  const [subStep, setSubStep] = useState<TutorialStep>("confirm");
  const [addedCount, setAddedCount] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);
  // Salons (coiffure/beauté) : deux natures d'article — prestation SANS stock vs produit
  // de beauté AVEC stock. L'expérience doit parler la langue du métier dans les deux cas.
  const [serviceMode, setServiceMode] = useState<"prestation" | "produit">("prestation");
  const isServiceCluster = cluster === "service";
  const addingProduct = isServiceCluster && serviceMode === "produit";

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
      price: Number(productPrice) || 0,
      cost: 0,
      category:
        productCategory.trim() || (addingProduct ? "Beauté" : tutorialConfig.defaultCategory),
      stock: Number(productStock) || 0,
      type: tutorialConfig.isService && serviceMode === "prestation" ? "service" : "product",
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
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h1 className="sr-only">Votre boutique est prête</h1>
        {/* `min()` en dvh : en paysage sur petit téléphone (≤568px de haut),
            l'écran ne réclame plus une hauteur impossible. */}
        <div className="flex min-h-[min(300px,45dvh)] flex-col items-center justify-center text-center space-y-6 py-4">
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
      </div>
    );
  }

  // Ajout de produits
  if (subStep === "add") {
    // Copie entièrement pilotée par le cluster — et par le mode choisi dans un salon :
    //   - bar → boissons, boucherie → prix au kg, coiffeur → prestation sans stock,
    //     puis produit de beauté avec stock si le salon vend aussi en boutique.
    const priceLabel =
      cluster === "location"
        ? "Prix de location (FCFA)"
        : isServiceCluster && !addingProduct
          ? "Prix de la prestation"
          : sellsByWeight
            ? "Prix au kg (FCFA)"
            : "Prix de vente (FCFA)";
    const showStockField = !tutorialConfig.isService || addingProduct;
    const showCategoryField = tutorialConfig.showCategory || addingProduct;
    const productLabel = addingProduct ? "Nom du produit" : tutorialConfig.productLabel;
    const productPlaceholder = addingProduct
      ? "Ex : Huile de coco, Shampooing"
      : tutorialConfig.productPlaceholder;
    const addTitle = addingProduct ? "Ajoutez un produit à vendre" : tutorialConfig.addTitle;
    const addDescription = addingProduct
      ? "Shampooings, huiles, cosmétiques… vendus en boutique, avec stock."
      : tutorialConfig.addDescription;
    const categoryPlaceholder = addingProduct
      ? "Ex : Produits de beauté, Accessoires"
      : tutorialConfig.categoryPlaceholder;
    const addedLabel =
      addedCount === 1
        ? !tutorialConfig.isService
          ? "produit ajouté"
          : addingProduct
            ? "produit ajouté"
            : "prestation ajoutée"
        : !tutorialConfig.isService
          ? "produits ajoutés"
          : "prestations et produits ajoutés";

    return (
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h1 className="sr-only">{addTitle}</h1>
        <div className="space-y-4 py-2">
          <StepShell icon={Package} title={addTitle} description={addDescription}>
            <div className="space-y-3">
              {/* Salon de coiffure : choisir ce qu'on ajoute — une prestation (pas de
                  stock) ou un produit de beauté (avec stock). L'onglet actif change les
                  champs, pas seulement les mots. */}
              {isServiceCluster && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceMode("prestation")}
                    aria-pressed={serviceMode === "prestation"}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left text-xs transition-all",
                      serviceMode === "prestation"
                        ? "border-primary bg-accent ring-1 ring-primary"
                        : "bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="font-medium text-sm">Prestation</span>
                    <span className="text-muted-foreground">Coiffure, soin, manucure…</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceMode("produit")}
                    aria-pressed={serviceMode === "produit"}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left text-xs transition-all",
                      serviceMode === "produit"
                        ? "border-primary bg-accent ring-1 ring-primary"
                        : "bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="font-medium text-sm">Produit à vendre</span>
                    <span className="text-muted-foreground">Produits de beauté, avec stock</span>
                  </button>
                </div>
              )}
              <div>
                <Label htmlFor="tut-name">{productLabel}</Label>
                <Input
                  id="tut-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={productPlaceholder}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tut-price">{priceLabel}</Label>
                  <Input
                    id="tut-price"
                    inputMode="numeric"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="h-11"
                  />
                </div>
                {showStockField && (
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
              {showCategoryField && (
                <div>
                  <Label htmlFor="tut-cat">Catégorie</Label>
                  <Input
                    id="tut-cat"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    placeholder={categoryPlaceholder}
                    className="h-11"
                  />
                </div>
              )}
            </div>
          </StepShell>

          {addedCount > 0 && (
            <p className="text-center text-sm text-primary font-medium">
              ✓ {addedCount} {addedLabel}
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
      </div>
    );
  }

  // Done
  return (
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h1 className="sr-only">Tout est prêt</h1>
      {/* Même garde-fou paysage que l'écran « Boutique prête » ci-dessus. */}
      <div className="flex min-h-[min(300px,45dvh)] flex-col items-center justify-center text-center space-y-6 py-4">
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
              ? `${addedCount} ${addedCount === 1 ? "élément enregistré" : "éléments enregistrés"}. Votre boutique "${prefs.workspaceName}" est prête à vendre.`
              : `Votre boutique "${prefs.workspaceName}" est configurée. Vous pourrez ajouter vos éléments plus tard.`}
          </p>
        </div>
        <Button size="lg" className="gap-2" onClick={onComplete}>
          {tutorialConfig.finalCtaLabel} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
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
        welcomeMessage:
          "Ajoutez vos coiffures et soins, puis les produits de beauté que vous vendez.",
        ctaLabel: "Ajouter mes prestations",
        addTitle: "Ajoutez une prestation",
        addDescription: "Nom et prix de la prestation — sans stock.",
        productLabel: "Nom de la prestation",
        productPlaceholder: "Ex : Coupe homme",
        showCategory: false,
        isService: true,
        finalCtaLabel: "Enregistrer ma première prestation",
      };
    case "location":
      return {
        ...base,
        welcomeMessage: "Enregistrez les actifs que vous louez (chaises, tentes, véhicules…).",
        ctaLabel: "Ajouter mes actifs",
        addTitle: "Ajoutez un actif à louer",
        addDescription: "Nom, prix de location et nombre d'exemplaires disponibles.",
        productLabel: "Nom de l'actif",
        productPlaceholder: "Ex : Chaise en plastique, Tente 6×12m",
        categoryPlaceholder: "Ex : Événementiel, Équipement, Véhicules",
        finalCtaLabel: "Faire ma première location",
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

/* L'ancien composant-modale `Onboarding()` a disparu : le parcours vit désormais
   dans la ROUTE /welcome (src/routes/welcome.tsx), qui conditionne le rendu de
   l'application entière — plus jamais une modale posée sur la caisse. */

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
