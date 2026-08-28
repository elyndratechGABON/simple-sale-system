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
  ChefHat,
  CupSoda,
  Download,
  FolderOpen,
  Info,
  Link2,
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
  Users,
  Utensils,
  Weight,
  Wrench,
  X,
} from "lucide-react";
import { ACTIVE_CLUSTERS, savePreferences, type Preferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { parsePairingPayload } from "@/lib/pairing";
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
} from "@/lib/db";
import {
  deleteShopRemote,
  getAccountQuota,
  getSubscriptionRequest,
  handshake,
  resetGatekeeper,
} from "@/lib/gatekeeper";
import { DevicePairingDialog } from "@/components/DevicePairingDialog";
import { ShopCard } from "@/components/ShopCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        {/* Formulaire : conteneur étroit VOLONTAIRE — des lignes de réglages qui
            s'étirent sur 1600px se lisent mal ; seul le titre suit l'échelle fluide. */}
        <h1 className="text-page-title font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Tout ce qui a été demandé au premier lancement se modifie ici.
        </p>
      </div>

      <InstallCard />
      <ShopCard />
      <LogoCard />
      <BusinessCard />
      <DevicesCard />
      {tablesEnabled && <TablesCard />}
      <ClientsCard />
      <DirectoryCard />
      <BackupCard />
      <DeleteShopCard />
      <AboutCard />
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
        <CardDescription>
          Définit le comportement de la caisse : gestion de tables, prix d'achat, etc.
        </CardDescription>
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

  const hasAccount = Boolean(profile?.accountPhone && profile.accountPassword);

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
          </div>
        )}

        <Button onClick={() => setPairingOpen(true)} disabled={!hasAccount}>
          <QrCode className="h-4 w-4 mr-2" />
          Ajouter un appareil
        </Button>
      </CardContent>

      <DevicePairingDialog open={pairingOpen} onOpenChange={setPairingOpen} />
    </Card>
  );
}

/**
 * Logo de la boutique : l'image choisie remplace l'icône de l'application à côté du nom,
 * dans l'en-tête. Stockée en dataURL (IndexedDB) après réduction à 256 px — une image
 * de plusieurs mégaoctets ne doit ni gonfler la base, ni ralentir l'en-tête.
 */
const SETTING_SHOP_LOGO = "shop_logo";

async function fileToLogoDataUrl(
  file: File,
  max = 256,
): Promise<{ dataUrl: string; img: HTMLImageElement }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/webp", 0.85), img };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function LogoCard() {
  const qc = useQueryClient();
  const { data: shopLogo } = useQuery({
    queryKey: ["shop_logo"],
    queryFn: () => getSetting<string>(SETTING_SHOP_LOGO),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { dataUrl } = await fileToLogoDataUrl(file);
      await setSetting(SETTING_SHOP_LOGO, dataUrl);
      qc.invalidateQueries({ queryKey: ["shop_logo"] });
      // Le logo illustre la boutique, il ne teinte PAS l'interface : l'identité couleur
      // reste celle de la marque (émeraude/or), quel que soit le fichier envoyé.
      toast.success("Logo de la boutique mis à jour");
    } catch {
      toast.error("Impossible d'utiliser cette image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    await setSetting(SETTING_SHOP_LOGO, null);
    qc.invalidateQueries({ queryKey: ["shop_logo"] });
    toast.success("Logo retiré — icône de l'application restaurée");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Logo de la boutique
        </CardTitle>
        <CardDescription>
          Remplace l'icône de l'application à côté du nom de votre boutique, en haut de l'écran.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
            <Button onClick={() => inputRef.current?.click()} disabled={busy}>
              <Upload className="h-4 w-4 mr-2" />
              {busy ? "Chargement…" : shopLogo ? "Changer le logo" : "Choisir un logo"}
            </Button>
            {shopLogo && (
              <Button variant="outline" onClick={handleRemove}>
                <Trash2 className="h-4 w-4 mr-2" /> Retirer
              </Button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e)}
        />
        <p className="text-xs text-muted-foreground">
          Image carrée conseillée — réduite à 256 px et stockée sur cet appareil.
        </p>
      </CardContent>
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
        <CardDescription>
          Posez la caisse sur l'écran d'accueil : elle s'ouvre en plein écran et fonctionne sans
          connexion.
        </CardDescription>
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
        <CardDescription>
          Destination des rapports, exports et sauvegardes lorsque la plateforme le permet.
        </CardDescription>
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
        <CardDescription>
          La sauvegarde contient toute la base : produits, ventes et lignes.
        </CardDescription>
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
