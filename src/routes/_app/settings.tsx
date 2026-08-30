// Paramètres — point unique de modification de tout ce que l'onboarding a demandé,
// plus le PIN et la sauvegarde/restauration.
//
// Le dossier de documents et le PIN vivaient auparavant dans /reports. Ils ont migré
// ici : /reports est une page d'analyse, elle n'avait pas à porter de la configuration.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  ChefHat,
  ChevronDown,
  CreditCard,
  CupSoda,
  Download,
  FolderOpen,
  Info,
  KeyRound,
  Link2,
  MessageCircle,
  MonitorSmartphone,
  Pencil,
  Plus,
  QrCode,
  Save,
  Scissors,
  ScanLine,
  ShoppingBag,
  Shirt,
  Sparkles,
  Store,
  Trash2,
  Upload,
  UserRound,
  Users,
  Utensils,
  Weight,
  Wifi,
  Wrench,
  X,
} from "lucide-react";
import { ACTIVE_CLUSTERS, savePreferences, type Preferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { parsePairingPayload } from "@/lib/pairing";
import {
  buildPaymentConfirmedWhatsappUrl,
  clearPaymentConfirmationPending,
  getPaymentConfirmationPending,
  type PaymentConfirmation,
} from "@/lib/payment-confirmation";
import {
  canPickDirectory,
  describeSaveResult,
  forgetDocumentsDirectory,
  getDocumentsDirectoryName,
  pickDocumentsDirectory,
  saveDocument,
} from "@/lib/files";
import {
  backupFilename,
  buildBackupBlob,
  parseBackup,
  restoreBackup,
  type BackupSummary,
} from "@/lib/exports/json";
import type { DatabaseSnapshot } from "@/lib/db";
import {
  getSetting,
  setSetting,
  getShopProfile,
  purgeAllData,
  listClients,
  addClient,
  updateClient,
  deleteClient,
  setShopAccount,
  type Client,
  type ShopProfile,
} from "@/lib/db";
import {
  deleteShopRemote,
  getAccountQuota,
  getSubscriptionRequest,
  handshake,
  joinByKeyword,
  resetGatekeeper,
} from "@/lib/gatekeeper";
import { DevicePairingDialog } from "@/components/DevicePairingDialog";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import { ShopCard } from "@/components/ShopCard";
import { ImageCropper } from "@/components/ImageCropper";
import { PlanChooser } from "@/components/PlanChooser";
import { PaymentModal } from "@/components/PaymentModal";
import type { PlanInfo } from "@/components/SubscriptionPlanCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — ELYNDRA CAISSE" },
      {
        name: "description",
        content:
          "Nom du commerce, couleur de l'application, dossier des documents, code PIN, sauvegarde et restauration.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  // La carte « Tables » est hors service tant que le système de tables est coupé : le
  // mode se réactive depuis la carte « Type de commerce », où vit l'interrupteur.
  const { tablesEnabled } = usePreferences();
  const isMobile = useIsMobile(1024);
  const [openSections, setOpenSections] = useState<string[]>(["shop"]);

  // Sur téléphone, une seule section dépliée à la fois évite le mur de 11 cartes qui se
  // regardait une à une au défilement. Au-delà de `lg`, tout est déplié d'office ; l'util-
  // isateur reste libre de replier une section (« accordéon ») même au bureau.
  useEffect(() => {
    setOpenSections(isMobile ? ["shop"] : ["shop", "clients", "compte", "donnees"]);
  }, [isMobile]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-2">
      <div className="mb-5">
        <h1 className="text-page-title font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Tout ce qui a été demandé au premier lancement se modifie ici.
        </p>
        {/* Au bureau, saut direct vers une section — repliée d'office, elle s'ouvre avant
            le défilement. Invisible sous `lg`, la navigation y vit déjà dans l'accordéon. */}
        <nav className="mt-4 hidden gap-2 lg:flex" aria-label="Sections des réglages">
          {[
            ["boutique", "Boutique"],
            ["clients", "Clients"],
            ["compte", "Compte et appareils"],
            ["donnees", "Données"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => {
                setOpenSections((sections) =>
                  sections.includes(id) ? sections : [...sections, id],
                );
                // Laisser l'accordéon se déplier avant de viser l'ancre.
                requestAnimationFrame(() =>
                  document
                    .getElementById(id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="space-y-1 lg:gap-2"
      >
        <AccordionItem id="boutique" value="shop" className="scroll-mt-24 border-0">
          <AccordionTrigger className="gap-3 rounded-xl px-2 py-3 hover:no-underline hover:bg-accent/40 data-[state=open]:bg-accent/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-4 w-4 text-primary" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-sm font-semibold text-foreground">Boutique</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pb-4 pt-1">
            <ShopCard />
            <AppearanceCard />
            <BusinessCard />
            {tablesEnabled && <TablesCard />}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="clients" className="border-0">
          <AccordionTrigger className="gap-3 rounded-xl px-2 py-3 hover:no-underline hover:bg-accent/40 data-[state=open]:bg-accent/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-sm font-semibold text-foreground">Clients</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pb-4 pt-1">
            <ClientsCard />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="compte" className="border-0">
          <AccordionTrigger className="gap-3 rounded-xl px-2 py-3 hover:no-underline hover:bg-accent/40 data-[state=open]:bg-accent/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-sm font-semibold text-foreground">Compte et appareils</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pb-4 pt-1">
            <SubscriptionCard />
            <DevicesCard />
            <InstallCard />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="donnees" className="border-0">
          <AccordionTrigger className="gap-3 rounded-xl px-2 py-3 hover:no-underline hover:bg-accent/40 data-[state=open]:bg-accent/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="h-4 w-4 text-primary" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-sm font-semibold text-foreground">Données</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pb-4 pt-1">
            <DirectoryCard />
            <BackupCard />
            <DeleteShopCard />
            <AboutCard />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/**
 * Type de commerce (cluster) et système de tables — les choix faits à l'onboarding.
 *
 * L'interrupteur de tables vit ici et non dans la carte « Tables » : une carte masquée
 * ne peut pas rendre son propre interrupteur. La carte « Tables » (gestion des libellés)
 * n'apparaît, elle, que lorsque le système est actif.
 */
/** Résout le nom d'icône (string) en composant Lucide réel. */
const ICON_MAP: Record<string, typeof Store> = {
  ShoppingBag,
  ChefHat,
  Coffee: CupSoda,
  Scissors,
  Shirt,
  Weight,
  Wrench,
  Sparkles,
};

function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}

function BusinessCard() {
  const qc = useQueryClient();
  const { cluster, tablesEnabled, customDomain } = usePreferences();
  const clusterConfig = ACTIVE_CLUSTERS.find((c) => c.id === cluster);
  const ClusterIcon = clusterConfig ? resolveIcon(clusterConfig.icon) : Store;

  function commit(patch: Partial<Preferences>) {
    savePreferences(patch);
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="h-4 w-4" /> Type de commerce
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clusterConfig && (
          <div className="flex items-center gap-3 rounded-xl border bg-accent/50 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ClusterIcon className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-semibold">{clusterConfig.label.split("/")[0].trim()}</p>
              {cluster === "personnalise" && customDomain && (
                <p className="text-sm font-medium text-foreground">{customDomain}</p>
              )}
              <p className="text-sm text-muted-foreground">{clusterConfig.description}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <div className="flex items-center gap-2 font-medium">
              <Utensils className="h-4 w-4" /> Système de tables
            </div>
            <p className="text-sm text-muted-foreground">
              {tablesEnabled
                ? "Commandes par table, encaissées en fin de service."
                : "Service direct : chaque vente est encaissée à la commande."}
            </p>
          </div>
          <Switch
            checked={tablesEnabled}
            onCheckedChange={(v) => commit({ tablesEnabled: v })}
            aria-label="Activer le système de tables"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Appareils du compte marchand : quota renvoyé par le dernier handshake et QR
 * d'appairage pour rattacher un nouvel écran. Le bouton n'ouvre le dialogue que
 * lorsque l'appareil connaît un compte (créé ou rejoint à l'onboarding).
 */
function DevicesCard() {
  const qc = useQueryClient();
  const [pairingOpen, setPairingOpen] = useState(false);
  // Drapeau one-shot « paiement confirmé » : posé au dépôt de la demande, consommé
  // uniquement après la validation serveur (`approved`) pour ouvrir WhatsApp.
  const [paymentPending, setPaymentPending] = useState<PaymentConfirmation | null>(() =>
    getPaymentConfirmationPending(),
  );
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    staleTime: 60_000,
  });
  const { data: quota } = useQuery({
    queryKey: ["account_quota"],
    queryFn: getAccountQuota,
    staleTime: 60_000,
  });
  const { data: request } = useQuery({
    queryKey: ["subscription_request"],
    queryFn: getSubscriptionRequest,
    staleTime: 60_000,
  });
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    staleTime: 60_000,
  });
  const { data: peers } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    staleTime: 60_000,
    enabled: Boolean(identity),
  });

  // Demande refusée = paiement douteux (ou jamais reçu) : aucun message « paiement
  // effectué » ne doit jamais partir, et le drapeau est purgé pour ne pas resservir.
  useEffect(() => {
    if (request?.status === "rejected" && paymentPending) {
      clearPaymentConfirmationPending();
      setPaymentPending(null);
    }
  }, [request?.status, paymentPending]);

  const hasAccount = Boolean(profile?.accountPhone && profile.accountPassword);
  // Écran « mots clé uniquement » (téléphone perdu) : rattaché au compte sans détenir
  // téléphone+mot de passe → il ne peut pas fabriquer de QR d'appairage, mais le
  // dialogue « Ajouter un appareil » doit s'ouvrir pour l'expliquer (chemin mot clé).
  const hasKeywordOnly = Boolean(profile?.accountKeyword) && !hasAccount;

  // Rattachement manuel : le serveur connaît déjà cet écran (le quota s'affiche) mais
  // la fiche locale n'a pas d'identifiants de compte — cas des écrans rattachés par
  // migration ou fusion, dont le mot de passe généré ne connaît qu'eux. Le serveur
  // accepte la réclamation car ce device_id est déjà membre du compte visé.
  const [claimPhone, setClaimPhone] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Scan du QR d'appairage : même parcours que l'onboarding « Rejoindre », proposé
  // ici aux écrans ajoutés APRÈS la création du compte. La caméra ne s'arme que sur
  // le clic du bouton dédié (geste frais = prompt d'autorisation au bon moment).
  const { scanning, startScan } = useBarcodeScanner();

  async function scanPairingQr() {
    try {
      const raw = await startScan();
      if (raw === null) return;
      const parsed = parsePairingPayload(raw);
      if (!parsed) {
        toast.error("Ce code n'est pas un code d'appairage ELYNDRA.");
        return;
      }
      setClaimPhone(parsed.phone);
      setClaimPassword(parsed.password);
      // Le nom du QR n'est qu'indicatif : cet écran garde SA propre enseigne.
      toast.success(
        `Compte « ${parsed.name || parsed.phone} » récupéré — vérifiez puis rattachez.`,
      );
    } catch {
      toast.error("Caméra indisponible — saisissez le téléphone et le mot de passe à la main.");
    }
  }

  async function claimAccount() {
    const phone = claimPhone.trim();
    const password = claimPassword.trim();
    if (!phone || !password) {
      toast.error("Renseignez le téléphone et le mot de passe du compte marchand.");
      return;
    }
    setClaiming(true);
    try {
      await setShopAccount({ name: profile?.storeName ?? "", phone, password });
      const result = await handshake();
      if (result.ok) {
        toast.success("Écran rattaché au compte marchand.");
        setClaimPassword("");
        await qc.invalidateQueries({ queryKey: ["shop_profile"] });
        await qc.invalidateQueries({ queryKey: ["account_quota"] });
        await qc.invalidateQueries({ queryKey: ["subscription_request"] });
      } else if (result.reason === "account_password") {
        toast.error("Téléphone ou mot de passe incorrect.");
      } else {
        toast.error("Serveur injoignable — réessayez une fois le réseau revenu.");
      }
    } finally {
      setClaiming(false);
    }
  }

  // Voie « mot clé de récupération » : téléphone perdu, ou compte visible au tableau de
  // bord sans identifiants. La validation est portée par le serveur (mot clé) ; hors ligne,
  // la réclamation reste posée et GatekeeperAlerts l'annonce (bandeau « 48 h »).
  const [claimKeyword, setClaimKeyword] = useState("");
  const [claimKeywordOwner, setClaimKeywordOwner] = useState("");
  const [joiningKeyword, setJoiningKeyword] = useState(false);
  // Chemin de secours replié par défaut : réservé au téléphone perdu, il n'a rien à faire
  // en permanence dans le flux principal de rattachement.
  const [keywordOpen, setKeywordOpen] = useState(false);

  async function joinWithKeyword() {
    const keyword = claimKeyword.trim().toUpperCase();
    const storeName = profile?.storeName?.trim() ?? "";
    const ownerName = claimKeywordOwner.trim() || (profile?.ownerName?.trim() ?? "");
    if (!keyword) {
      toast.error("Saisissez le mot clé reçu à la création du compte (format XXXX-XXXX).");
      return;
    }
    setJoiningKeyword(true);
    try {
      const result = await joinByKeyword({ storeName, ownerName, keyword });
      if (result.status === "verified") {
        toast.success("Compte vérifié — écran rattaché au compte marchand.");
        setClaimKeyword("");
        await qc.invalidateQueries({ queryKey: ["shop_profile"] });
        await qc.invalidateQueries({ queryKey: ["account_quota"] });
        await qc.invalidateQueries({ queryKey: ["subscription_request"] });
      } else if (result.status === "blocked") {
        toast.error("Mot clé invalide : aucun compte ne correspond. Vérifiez vos informations.");
      } else {
        toast.info(
          "Serveur injoignable — la vérification reprendra automatiquement au retour du réseau (48 h max).",
        );
      }
    } finally {
      setJoiningKeyword(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4" /> Appareils
        </CardTitle>
        <CardDescription>
          {hasAccount
            ? "Rattachez une deuxième ou troisième caisse au même compte : scannez le code QR sur le nouvel écran."
            : "Rejoignez un compte marchand pour partager votre abonnement entre plusieurs caisses."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {quota && (
          <div className="flex items-center justify-between rounded-lg border bg-accent/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Places utilisées</span>
            <Badge
              variant={quota.deviceCount >= quota.maxDevices ? "destructive" : "secondary"}
              className="tabular-nums"
            >
              {quota.deviceCount} / {quota.maxDevices}
            </Badge>
          </div>
        )}

        {request && (
          <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
            <span className="text-sm text-muted-foreground">
              Demande d'abonnement
              {typeof request.plan_price === "number" && request.plan_price > 0
                ? ` (${request.plan_price.toLocaleString("fr-FR")} F)`
                : ""}
            </span>
            <Badge
              variant={
                request.status === "pending"
                  ? "secondary"
                  : request.status === "approved"
                    ? "default"
                    : "destructive"
              }
            >
              {request.status === "pending"
                ? "En attente de validation"
                : request.status === "approved"
                  ? "Validée"
                  : "Refusée"}
            </Badge>
          </div>
        )}

        {paymentPending && request?.status === "approved" && (
          <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <BadgeCheck className="h-4 w-4 text-emerald-600" /> Paiement confirmé
              </p>
              <button
                type="button"
                onClick={() => {
                  clearPaymentConfirmationPending();
                  setPaymentPending(null);
                }}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Masquer la confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Votre abonnement est activé ({paymentPending.planName} ·{" "}
              {paymentPending.planPrice.toLocaleString("fr-FR")} F · réf. {paymentPending.reference}
              ). Prévenez l'administrateur sur WhatsApp : le message est prêt, appuyez sur Envoyer.
            </p>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                window.open(
                  buildPaymentConfirmedWhatsappUrl(paymentPending, request.decided_at ?? undefined),
                  "_blank",
                  "noreferrer",
                );
                clearPaymentConfirmationPending();
                setPaymentPending(null);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" /> Notifier sur WhatsApp
            </Button>
          </div>
        )}

        {!hasAccount && (
          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" /> Rejoindre le compte marchand
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Scannez le QR affiché par une caisse déjà abonnée, ou saisissez son téléphone et son
                mot de passe — puis « Ajouter un appareil » deviendra disponible.
              </p>
            </div>
            {/* Chemin primaire : scanner le QR d'une caisse abonnée (même parcours
                que l'onboarding « Rejoindre ») — la saisie manuelle reste en repli. */}
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={scanning}
              onClick={() => void scanPairingQr()}
            >
              <ScanLine className="h-4 w-4 mr-2" />
              {scanning ? "Caméra active…" : "Scanner le QR d'une caisse abonnée"}
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="claim-phone">Téléphone du compte</Label>
                <Input
                  id="claim-phone"
                  type="tel"
                  value={claimPhone}
                  onChange={(e) => setClaimPhone(e.target.value)}
                  placeholder="Ex : +241 06 123 456"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-password">Mot de passe du compte</Label>
                <Input
                  id="claim-password"
                  type="password"
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button variant="outline" disabled={claiming} onClick={() => void claimAccount()}>
              <Link2 className="h-4 w-4 mr-2" />
              {claiming ? "Rattachement…" : "Rattacher cet écran au compte"}
            </Button>

            <Collapsible
              open={keywordOpen}
              onOpenChange={setKeywordOpen}
              className="border-t border-border/60 pt-3"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-sm font-medium"
                >
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> Téléphone perdu, ou plus de mot de passe ?
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Rejoignez le compte avec le mot clé reçu à la création (affiché une seule fois).
                  Saisissez le nom de la boutique, le propriétaire et le mot clé.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="claim-kw-store">Nom de la boutique</Label>
                    <Input
                      id="claim-kw-store"
                      value={profile?.storeName ?? ""}
                      readOnly
                      className="bg-muted/40 text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="claim-kw-owner">Nom du propriétaire</Label>
                    <Input
                      id="claim-kw-owner"
                      value={claimKeywordOwner}
                      onChange={(e) => setClaimKeywordOwner(e.target.value)}
                      placeholder={profile?.ownerName?.trim() || "Ex : Jean-Marc"}
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="claim-kw">Mot clé de récupération</Label>
                  <Input
                    id="claim-kw"
                    value={claimKeyword}
                    onChange={(e) => setClaimKeyword(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    className="font-mono tracking-widest"
                    autoComplete="off"
                  />
                </div>
                <Button
                  variant="outline"
                  className="mt-3"
                  disabled={joiningKeyword}
                  onClick={() => void joinWithKeyword()}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {joiningKeyword ? "Vérification…" : "Rejoindre avec ce mot clé"}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {(hasAccount || hasKeywordOnly) && identity && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Wifi className="h-4 w-4" /> Caisses synchronisées
            </p>
            <p className="text-xs text-muted-foreground">
              Les caisses du même compte relient produits, ventes et stock hors serveur — le relais
              ne stocke qu'un temps, jamais les lignes de vente.
            </p>
            {peers && peers.length > 0 ? (
              <ul className="space-y-1.5">
                {peers.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {p.status === "pending" ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      ) : (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {p.device_name || "Écran sans nom"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.role && ROLE_LABELS[p.role]} · {p.id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                    <Badge variant={p.status === "pending" ? "outline" : "secondary"}>
                      {p.status === "pending" ? "À approuver" : "Synchronisé"}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucune autre caisse rencontrée pour l'instant : ouvrez « Ajouter un appareil » pour
                afficher un code de paire ou en saisir un.
              </p>
            )}
          </div>
        )}

        <Button onClick={() => setPairingOpen(true)} disabled={!hasAccount && !hasKeywordOnly}>
          <QrCode className="h-4 w-4 mr-2" />
          Ajouter un appareil
        </Button>
      </CardContent>

      <DevicePairingDialog open={pairingOpen} onOpenChange={setPairingOpen} />
    </Card>
  );
}

/**
 * Apparence : photo de profil (en-tête, à côté des réglages) et logo de la boutique
 * (icône affichée au-dessus du nom). Deux images, deux usages — une seule carte.
 * Photo et logo sont réduits au recadrage et stockés localement (préférences pour la
 * photo, IndexedDB pour le logo) : une image de plusieurs mégaoctets ne doit ni gonfler
 * la base, ni ralentir l'en-tête.
 */
const SETTING_SHOP_LOGO = "shop_logo";

function AppearanceCard() {
  const qc = useQueryClient();
  const { ownerPhoto } = usePreferences();
  const { data: shopLogo } = useQuery({
    queryKey: ["shop_logo"],
    queryFn: () => getSetting<string>(SETTING_SHOP_LOGO) ?? null,
  });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [photoCropOpen, setPhotoCropOpen] = useState(false);
  const [photoCropSource, setPhotoCropSource] = useState("");
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSource, setLogoCropSource] = useState("");

  function handlePhotoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    // Le recadrage, pas un simple rétrécissement : un avatar carré choisi à la main
    // plutôt que le centre aveugle d'une photo d'identité mal cadrée.
    if (photoCropSource) URL.revokeObjectURL(photoCropSource);
    setPhotoCropSource(URL.createObjectURL(file));
    setPhotoCropOpen(true);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function applyPhotoCropped(dataUrl: string) {
    // 128 px suffit pour un avatar de 40 px dans l'en-tête, même en écran retina ×3.
    savePreferences({ ownerPhoto: dataUrl });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    toast.success("Photo de profil mise à jour");
    setPhotoCropOpen(false);
    if (photoCropSource) URL.revokeObjectURL(photoCropSource);
    setPhotoCropSource("");
  }

  function removePhoto() {
    savePreferences({ ownerPhoto: "" });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  function handleLogoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    // Recadrage carré choisi à la main, pas un simple rétrécissement : un logo
    // horizontal perdrait ce qui dépasse du cadre sans qu'on ait son mot à dire.
    if (logoCropSource) URL.revokeObjectURL(logoCropSource);
    setLogoCropSource(URL.createObjectURL(file));
    setLogoCropOpen(true);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  async function applyLogoCropped(dataUrl: string) {
    await setSetting(SETTING_SHOP_LOGO, dataUrl);
    qc.invalidateQueries({ queryKey: ["shop_logo"] });
    // Le logo illustre la boutique, il ne teinte PAS l'interface : l'identité couleur
    // reste celle de la marque (émeraude/or), quel que soit le fichier envoyé.
    toast.success("Logo de la boutique mis à jour");
    setLogoCropOpen(false);
    if (logoCropSource) URL.revokeObjectURL(logoCropSource);
    setLogoCropSource("");
  }

  async function removeLogo() {
    await setSetting(SETTING_SHOP_LOGO, null);
    qc.invalidateQueries({ queryKey: ["shop_logo"] });
    toast.success("Logo retiré — icône de l'application restaurée");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Apparence
        </CardTitle>
        <CardDescription>
          La photo de profil et le logo de la boutique, affichés dans l'en-tête.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-primary/10 text-sm font-semibold text-primary">
            {ownerPhoto ? (
              <img src={ownerPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Photo de profil</p>
            <p className="text-xs text-muted-foreground truncate">
              Affichée dans l'en-tête, à côté des réglages.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            Changer
          </Button>
          {ownerPhoto && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Retirer la photo de profil"
              onClick={removePhoto}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handlePhotoFile(e)}
        />

        <div className="flex items-center gap-3">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted/30 p-1">
            {shopLogo ? (
              <img src={shopLogo} alt="Logo actuel" className="h-full w-full object-contain" />
            ) : (
              <img
                src="/logo-header.png"
                alt="Logo par défaut"
                className="h-full w-full object-contain"
              />
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => logoInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              {shopLogo ? "Changer le logo" : "Choisir un logo"}
            </Button>
            {shopLogo && (
              <Button variant="outline" onClick={removeLogo}>
                <Trash2 className="h-4 w-4 mr-2" /> Retirer
              </Button>
            )}
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleLogoFile(e)}
        />
        <p className="text-xs text-muted-foreground">
          Images réduites au recadrage et stockées sur cet appareil.
        </p>
      </CardContent>

      <ImageCropper
        open={photoCropOpen}
        onOpenChange={setPhotoCropOpen}
        source={photoCropSource}
        outputSize={128}
        title="Recadrer la photo de profil"
        onCrop={applyPhotoCropped}
      />
      <ImageCropper
        open={logoCropOpen}
        onOpenChange={setLogoCropOpen}
        source={logoCropSource}
        outputSize={256}
        title="Recadrer le logo"
        onCrop={(d) => void applyLogoCropped(d)}
      />
    </Card>
  );
}

/**
 * Abonnement : licence actuelle (validité, fin d'abonnement, dernière synchro) et
 * changement de plan. Regroupé ici avec la carte « Appareils » — la vie du compte
 * marchand, pas celle de la boutique.
 */
const DAY_MS = 86_400_000;

function daysLeft(expiryDate: number): number {
  return Math.max(0, Math.ceil((expiryDate - Date.now()) / DAY_MS));
}

function SubscriptionCard() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    staleTime: 60_000,
  });
  const [planChooserOpen, setPlanChooserOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);

  if (!profile) return null;

  const left = daysLeft(profile.expiryDate);
  const expired = left <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" /> Abonnement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Badge variant={expired ? "destructive" : "default"} className="mt-0.5">
            {expired ? "Expiré" : `Licence · ${left} j`}
          </Badge>
          <p className="text-sm text-muted-foreground">
            Inscrit le {formatDateShort(profile.registrationDate)} · jusqu'au{" "}
            {formatDateShort(profile.expiryDate)}
          </p>
        </div>
        {profile.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Dernière synchronisation :{" "}
            {new Date(profile.lastSyncedAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        <div className="rounded-xl border bg-muted/30 p-3">
          <Button variant="outline" onClick={() => setPlanChooserOpen(true)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Changer de plan
          </Button>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            Synchronisation automatique avec l'orchestrateur. Hors ligne, la caisse fonctionne
            normalement.
          </p>
        </div>
      </CardContent>

      <PlanChooser
        open={planChooserOpen}
        onOpenChange={setPlanChooserOpen}
        onSelect={(plan) => {
          setSelectedPlan(plan);
          setPaymentOpen(true);
        }}
      />
      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        storeName={profile.storeName}
        ownerName={profile.ownerName}
        selectedPlan={selectedPlan}
      />
    </Card>
  );
}

/**
 * Chemin d'installation pour qui est arrivé directement sur l'application sans passer par
 * la page de présentation.
 *
 * Il existait auparavant un bouton flottant en bas à droite de CHAQUE page : il recouvrait
 * du contenu, « Valider la vente » comprise. Ici il ne gêne rien, et disparaît une fois
 * l'application installée.
 */
function InstallCard() {
  const { canInstall, installed, isIos, platform, insecure, install } = usePwaInstall();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  // Repli orchestré quand aucun prompt natif n'est disponible : cause exacte
  // affichée sous le bouton — jamais le message générique historique.
  const [hint, setHint] = useState<"insecure" | "android-menu" | "desktop-menu" | null>(null);

  if (installed || !canInstall) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" /> Installer l'application
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={async () => {
            const outcome = await install();
            if (outcome === "ios-help") setIosHelpOpen(true);
            if (outcome === "unavailable") {
              setHint(
                insecure ? "insecure" : platform === "android" ? "android-menu" : "desktop-menu",
              );
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Installer
        </Button>
        {hint === "insecure" && (
          <p className="text-sm text-muted-foreground">
            Vous êtes en http sur une adresse locale : les navigateurs n'y proposent jamais
            l'installation. Ouvrez l'application via son adresse <b>https://</b>, puis revenez.
          </p>
        )}
        {hint === "android-menu" && (
          <p className="text-sm text-muted-foreground">
            Menu ⋮ du navigateur → « Installer l'application » (ou « Ajouter à l'écran d'accueil »),
            puis confirmez.
          </p>
        )}
        {hint === "desktop-menu" && (
          <p className="text-sm text-muted-foreground">
            Icône d'installation dans la barre d'adresse, ou menu du navigateur → « Installer
            ELYNDRA CAISSE » (Edge : ⋯ → Applications).
          </p>
        )}
        {/* Contrairement à la page de présentation, aucune navigation préalable n'est
            nécessaire : nous sommes déjà dans l'application, donc dans le périmètre que
            Safari retiendra pour le raccourci. */}
        {(isIos || hint === null) && (
          <p className="text-sm text-muted-foreground">
            Sur iPhone et iPad, l'installation passe par le menu Partager de Safari.
          </p>
        )}
      </CardContent>

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter à l'écran d'accueil</DialogTitle>
            <DialogDescription asChild>
              <ol className="mt-2 space-y-2 text-left text-sm">
                <li>1. Touchez le bouton Partager, en bas de Safari.</li>
                <li>2. Faites défiler puis choisissez « Ajouter à l'écran d'accueil ».</li>
                <li>3. Confirmez avec « Ajouter ».</li>
              </ol>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * Libellés de tables proposés à la caisse.
 *
 * La liste s'étend aussi toute seule : ouvrir une table sous un nom inconnu depuis la
 * caisse l'ajoute ici. Cet écran sert à la mettre en ordre, pas à la construire.
 */
function TablesCard() {
  const qc = useQueryClient();
  const { tables } = usePreferences();
  const [draft, setDraft] = useState("");

  function commit(next: string[]) {
    savePreferences({ tables: next });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Utensils className="h-4 w-4" /> Tables
        </CardTitle>
        <CardDescription>
          Proposées à l'ouverture d'une addition. Retirer une table d'ici ne touche à aucune vente
          déjà enregistrée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {tables.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pl-3 pr-1 text-sm"
            >
              {t}
              {/* Cible 44px débordant visuellement de la pastille (-m) : le
                  geste destructeur le plus petit de l'app était un 24×24. */}
              <Button
                size="icon"
                variant="ghost"
                className="-mr-2 -my-2.5 h-11 w-11 rounded-full text-muted-foreground hover:text-destructive sm:-mr-1.5 sm:-my-1 sm:h-8 sm:w-8"
                aria-label={`Retirer la table ${t}`}
                onClick={() => commit(tables.filter((x) => x !== t))}
              >
                <X className="h-3 w-3" />
              </Button>
            </span>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="table-new">Ajouter une table</Label>
            <Input
              id="table-new"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex : Terrasse 1"
              onKeyDown={(e) => {
                if (e.key === "Enter") addTable();
              }}
            />
          </div>
          <Button onClick={addTable}>Ajouter</Button>
        </div>
      </CardContent>
    </Card>
  );

  function addTable() {
    const clean = draft.trim();
    if (!clean) {
      toast.error("Nom de table requis");
      return;
    }
    if (tables.includes(clean)) {
      toast.error(`« ${clean} » est déjà dans la liste`);
      return;
    }
    commit([...tables, clean]);
    setDraft("");
    toast.success(`Table ${clean} ajoutée`);
  }
}

function ClientsCard() {
  const qc = useQueryClient();
  const { cluster } = usePreferences();
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setName("");
    setPhone("");
    setNotes("");
    setEditing(null);
    setAddOpen(false);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone ?? "");
    setNotes(c.notes ?? "");
    setAddOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error("Nom requis");
      if (editing) {
        await updateClient({
          ...editing,
          name: n,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await addClient({
          name: n,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(editing ? "Client mis à jour" : "Client ajouté");
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé");
    },
  });

  if (cluster !== "service" && cluster !== "clothing" && cluster !== "magasin") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Clients
        </CardTitle>
        <CardDescription>
          Registre de vos clients. Sélectionnez un nom en caisse pour suivre l'historique.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clients.length > 0 && (
          <div className="space-y-1">
            {clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  {/* `truncate` sur le BLOC (un span inline n'ellipsis pas) : une
                      note longue reste sur une ligne coupée au lieu de pousser
                      la carte en largeur. */}
                  <div className="truncate text-xs text-muted-foreground">
                    {c.phone && <span>{c.phone}</span>}
                    {c.phone && c.notes && <span> · </span>}
                    {c.notes && <span>{c.notes}</span>}
                    {!c.phone && !c.notes && (
                      <span className="text-muted-foreground/60">Pas de détails</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 sm:h-9 sm:w-9"
                    aria-label={`Modifier ${c.name}`}
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 sm:h-9 sm:w-9"
                    aria-label={`Supprimer ${c.name}`}
                    onClick={() => {
                      if (confirm(`Supprimer "${c.name}" ?`)) removeMut.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun client enregistré. Ajoutez vos clients réguliers pour suivre leur historique.
          </p>
        )}

        <Dialog
          open={addOpen}
          onOpenChange={(v) => {
            setAddOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                reset();
                setAddOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client-nom">Nom *</Label>
                <Input
                  id="client-nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Mme Kombila"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="client-tel">Téléphone</Label>
                <Input
                  id="client-tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
              <div>
                <Label htmlFor="client-notes">Notes</Label>
                <Input
                  id="client-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, préférences…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={reset}>
                Annuler
              </Button>
              <Button onClick={() => saveMut.mutate()} disabled={!name.trim() || saveMut.isPending}>
                {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function DirectoryCard() {
  // `canPickDirectory()` interroge `window` : false au rendu serveur, true dans un
  // Chrome de bureau. L'évaluer pendant le rendu casserait l'hydratation.
  const [canPick, setCanPick] = useState(false);
  useEffect(() => setCanPick(canPickDirectory()), []);
  const { data: directory, refetch } = useQuery({
    queryKey: ["settings", "documents_dir"],
    queryFn: getDocumentsDirectoryName,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="h-4 w-4" /> Dossier des documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canPick ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  const picked = await pickDocumentsDirectory();
                  if (picked) toast.success(`Documents enregistrés dans « ${picked} »`);
                  refetch();
                }}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {directory ? "Changer de dossier" : "Choisir un dossier"}
              </Button>
              {directory && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await forgetDocumentsDirectory();
                    toast.success("Dossier oublié");
                    refetch();
                  }}
                >
                  Oublier
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {directory
                ? `Dossier actuel : « ${directory} »`
                : "Sans dossier, les fichiers vont dans Téléchargements."}
            </p>
          </>
        ) : (
          // Aucun navigateur mobile n'expose showDirectoryPicker — cf. src/lib/files.ts.
          <p className="text-sm text-muted-foreground">
            Ce navigateur ne permet pas de choisir un dossier. Les documents sont proposés au
            partage ou enregistrés dans Téléchargements. L'application Android écrit directement
            dans Documents.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BackupCard() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  // Le fichier est validé AVANT toute écriture, et le résumé est affiché à l'utilisateur
  // pour qu'il confirme en connaissance de cause : la restauration écrase tout.
  const [pending, setPending] = useState<{
    snapshot: DatabaseSnapshot;
    summary: BackupSummary;
  } | null>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      const blob = await buildBackupBlob();
      const filename = backupFilename();
      return { result: await saveDocument(blob, filename), filename };
    },
    onSuccess: ({ result, filename }) => toast.success(describeSaveResult(result, filename)),
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMut = useMutation({
    mutationFn: async (snapshot: DatabaseSnapshot) => restoreBackup(snapshot),
    onSuccess: () => {
      // Tout le cache métier est périmé d'un coup : la base entière vient d'être remplacée.
      qc.invalidateQueries();
      setPending(null);
      toast.success("Sauvegarde restaurée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(file: File) {
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fichier invalide");
    } finally {
      // Sans ce reset, resélectionner le MÊME fichier ne déclencherait pas `change`.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Save className="h-4 w-4" /> Sauvegarde et restauration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="h-4 w-4 mr-2" /> Sauvegarder
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Restaurer un fichier
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Les préférences (nom, couleur, dossier, PIN) ne sont pas incluses : elles sont propres à
          cet appareil.
        </p>
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Restaurer cette sauvegarde ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Toutes les données actuelles seront <strong>définitivement remplacées</strong> par
                  le contenu du fichier. Cette action est irréversible.
                </p>
                {pending && (
                  <ul className="text-sm space-y-0.5">
                    <li>{pending.summary.products} produit(s)</li>
                    <li>{pending.summary.sales} vente(s)</li>
                    {pending.summary.subscriptions > 0 && (
                      <li>{pending.summary.subscriptions} abonnement(s)</li>
                    )}
                    {pending.summary.exportedAt && (
                      <li className="text-muted-foreground">
                        Sauvegarde du {new Date(pending.summary.exportedAt).toLocaleString("fr-FR")}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && restoreMut.mutate(pending.snapshot)}
              disabled={restoreMut.isPending}
            >
              Remplacer mes données
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/**
 * Zone rouge : suppression de la boutique.
 *
 * Le serveur d'abord, la base locale ensuite — tout ou rien. Si le réseau manque, rien
 * n'est effacé : on ne veut pas d'un appareil dont le serveur croirait encore le compte
 * actif, qui ressusciterait au prochain handshake (auto-provisionnement). Après la purge,
 * l'application revient au premier lancement : l'assistant rouvre, un nouveau `deviceId`
 * est généré au prochain montage, et le serveur recrée une boutique à l'essai.
 */
function DeleteShopCard() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useMutation({
    mutationFn: async () => {
      const profile = await getShopProfile();
      if (!profile) throw new Error("Aucune boutique enregistrée sur cet appareil.");
      const remote = await deleteShopRemote(profile.deviceId, profile.storeName);
      if (!remote.ok) {
        // Le serveur a refusé ou est injoignable (CORS, panne) : on prévient mais on
        // continue la purge locale — l'utilisateur ne doit pas rester bloqué.
        toast.warning(`Serveur : ${remote.error ?? "injoignable"}. Purge locale quand même.`);
      }
      await purgeAllData();
      resetGatekeeper();
      savePreferences({ onboarded: false });
    },
    onSuccess: () => {
      toast.success("Boutique supprimée — au premier lancement !");
      window.location.reload();
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" /> Supprimer la boutique
        </CardTitle>
        <CardDescription>
          Efface ce terminal et le compte de la boutique chez l'orchestrateur : historique des
          ventes, paiements, commandes et données synchronisées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" /> Supprimer la boutique
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={(v) => !v && setConfirmOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Tout effacer ?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    Les données de <strong>cet appareil</strong> et le compte de la boutique sur le
                    serveur seront <strong>définitivement effacés</strong> : ventes, produits,
                    paiements et abonnement. Cette action est irréversible.
                  </p>
                  <p>
                    L'application repart au premier lancement, avec une base vierge et un essai
                    renouvelé.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  // Empêche Radix de fermer le dialogue pendant la suppression : il
                  // reste ouvert tant que le réseau travaille, et se referme en cas
                  // d'échec (onError) — en cas de succès, la page se recharge.
                  e.preventDefault();
                  deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? "Suppression…" : "Tout effacer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function AboutCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4" /> À propos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="ECAISSE" className="h-10 w-10" />
          <div>
            <p className="font-semibold text-foreground">ELYNDRA CAISSE</p>
            <p>La caisse qui marche sans réseau.</p>
          </div>
        </div>
        <p>Développé par ELYNDRA TECH.</p>
        <p>
          Vos données sont stockées localement sur cet appareil. Aucune donnée n'est envoyée sans
          votre accord.
        </p>
      </CardContent>
    </Card>
  );
}
