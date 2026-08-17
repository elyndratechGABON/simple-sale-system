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
  Check,
  ChefHat,
  CupSoda,
  Download,
  FolderOpen,
  KeyRound,
  MapPin,
  Palette,
  Pencil,
  Phone,
  Plus,
  Save,
  Scissors,
  ShoppingBag,
  Shirt,
  Store,
  Trash2,
  Upload,
  User,
  Users,
  Utensils,
  Weight,
  Wrench,
  X,
} from "lucide-react";
import {
  ACTIVE_CLUSTERS,
  applyTheme,
  PRESET_HUES,
  savePreferences,
  swatchColor,
  type Preferences,
} from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { usePwaInstall } from "@/hooks/use-pwa-install";
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
import { setPin, verifyPin } from "@/lib/pin";
import type { DatabaseSnapshot } from "@/lib/db";
import {
  getShopProfile,
  purgeAllData,
  listClients,
  addClient,
  updateClient,
  deleteClient,
  type Client,
} from "@/lib/db";
import { deleteShopRemote, resetGatekeeper } from "@/lib/gatekeeper";
import { ShopCard } from "@/components/ShopCard";
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
      { title: "Paramètres — Indra Caisse" },
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
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Tout ce qui a été demandé au premier lancement se modifie ici.
        </p>
      </div>

      <InstallCard />
      <ShopCard />
      <WorkspaceCard />
      <BusinessCard />
      {tablesEnabled && <TablesCard />}
      <ClientsCard />
      <ColorCard />
      <DirectoryCard />
      <BackupCard />
      <PinCard />
      <DeleteShopCard />
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
};

function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}

function BusinessCard() {
  const qc = useQueryClient();
  const { cluster, tablesEnabled } = usePreferences();

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
        <div className="grid grid-cols-2 gap-3">
          {ACTIVE_CLUSTERS.map((c) => (
            <TypeOption
              key={c.id}
              selected={cluster === c.id}
              onClick={() => commit({ cluster: c.id })}
              icon={resolveIcon(c.icon)}
              title={c.label.split("/")[0].trim()}
              description={c.description}
            />
          ))}
        </div>

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

/** Bouton de choix du type de commerce, dans Paramètres. */
function TypeOption({
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
        "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
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

/**
 * Chemin d'installation pour qui est arrivé directement sur l'application sans passer par
 * la page de présentation.
 *
 * Il existait auparavant un bouton flottant en bas à droite de CHAQUE page : il recouvrait
 * du contenu, « Valider la vente » comprise. Ici il ne gêne rien, et disparaît une fois
 * l'application installée.
 */
function InstallCard() {
  const { canInstall, installed, isIos, install } = usePwaInstall();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

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
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Installer
        </Button>
        {/* Contrairement à la page de présentation, aucune navigation préalable n'est
            nécessaire : nous sommes déjà dans l'application, donc dans le périmètre que
            Safari retiendra pour le raccourci. */}
        {isIos && (
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

function WorkspaceCard() {
  const qc = useQueryClient();
  const prefs = usePreferences();
  const [name, setName] = useState(prefs.workspaceName);
  const [phone, setPhone] = useState(prefs.phone);
  const [quarter, setQuarter] = useState(prefs.quarter);
  const [ownerName, setOwnerName] = useState(prefs.ownerName);

  // `prefs` arrive après montage (localStorage n'est pas lisible au rendu serveur) :
  // sans cette resynchronisation, les champs resteraient bloqués sur les valeurs par défaut.
  useEffect(() => setName(prefs.workspaceName), [prefs.workspaceName]);
  useEffect(() => setPhone(prefs.phone), [prefs.phone]);
  useEffect(() => setQuarter(prefs.quarter), [prefs.quarter]);
  useEffect(() => setOwnerName(prefs.ownerName), [prefs.ownerName]);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Le nom ne peut pas être vide");
      return;
    }
    savePreferences({
      workspaceName: trimmed,
      phone: phone.trim(),
      quarter: quarter.trim(),
      ownerName: ownerName.trim(),
    });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    toast.success("Enregistré");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="h-4 w-4" /> Espace de travail
        </CardTitle>
        <CardDescription>Affiché dans l'en-tête et en tête des documents exportés.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div>
            <Label htmlFor="ws-name">Nom de l'entreprise</Label>
            <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ws-phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Téléphone
            </Label>
            <Input
              id="ws-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : +243 81 234 5678"
            />
          </div>
          <div>
            <Label htmlFor="ws-quarter" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Quartier
            </Label>
            <Input
              id="ws-quarter"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              placeholder="Ex : Commune de la Gombe"
            />
          </div>
          <div>
            <Label htmlFor="ws-owner" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Nom du propriétaire
            </Label>
            <Input
              id="ws-owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex : Marie Kabongo"
            />
          </div>
        </div>
        <Button onClick={save}>
          <Save className="h-4 w-4 mr-2" /> Enregistrer
        </Button>
      </CardContent>
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
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
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
                  <div className="text-xs text-muted-foreground">
                    {c.phone && <span>{c.phone}</span>}
                    {c.phone && c.notes && <span> · </span>}
                    {c.notes && <span className="truncate">{c.notes}</span>}
                    {!c.phone && !c.notes && (
                      <span className="text-muted-foreground/60">Pas de détails</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
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

function ColorCard() {
  const qc = useQueryClient();
  const prefs = usePreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" /> Couleur principale
        </CardTitle>
        <CardDescription>
          Boutons, totaux et graphiques. Le changement est immédiat et conservé.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-3">
          {PRESET_HUES.map((p) => (
            <button
              key={p.hue}
              type="button"
              aria-label={p.label}
              aria-pressed={prefs.hue === p.hue}
              onClick={() => {
                // Appliqué avant d'être enregistré : l'utilisateur voit le résultat
                // sur l'écran réel, pas sur la pastille.
                applyTheme(p.hue);
                savePreferences({ hue: p.hue });
                qc.invalidateQueries({ queryKey: ["preferences"] });
              }}
              className={cn(
                "aspect-square rounded-xl border-2 transition-transform flex items-center justify-center",
                prefs.hue === p.hue
                  ? "border-foreground scale-105"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: swatchColor(p.hue) }}
            >
              {prefs.hue === p.hue && <Check className="h-5 w-5 text-white drop-shadow" />}
            </button>
          ))}
        </div>
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

function PinCard() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Code PIN
        </CardTitle>
        <CardDescription>
          Protège l'annulation d'une vente. PIN par défaut : <code>1234</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="old">PIN actuel</Label>
            <Input
              id="old"
              type="password"
              inputMode="numeric"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new">Nouveau PIN</Label>
            <Input
              id="new"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={() => {
            if (!verifyPin(oldPin)) {
              toast.error("PIN actuel incorrect");
              return;
            }
            if (newPin.length < 4) {
              toast.error("Nouveau PIN : au moins 4 caractères");
              return;
            }
            setPin(newPin);
            toast.success("PIN mis à jour");
            setOldPin("");
            setNewPin("");
          }}
        >
          Modifier le PIN
        </Button>
      </CardContent>
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
