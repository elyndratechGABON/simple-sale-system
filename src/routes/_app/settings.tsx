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
  Download,
  FolderOpen,
  KeyRound,
  Palette,
  Save,
  Store,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import { applyTheme, PRESET_HUES, savePreferences, swatchColor } from "@/lib/settings";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — Caisse POS" },
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
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Tout ce qui a été demandé au premier lancement se modifie ici.
        </p>
      </div>

      <InstallCard />
      <WorkspaceCard />
      <TablesCard />
      <ColorCard />
      <DirectoryCard />
      <BackupCard />
      <PinCard />
    </div>
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

  // `prefs` arrive après montage (localStorage n'est pas lisible au rendu serveur) :
  // sans cette resynchronisation, le champ resterait bloqué sur la valeur par défaut.
  useEffect(() => setName(prefs.workspaceName), [prefs.workspaceName]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="h-4 w-4" /> Espace de travail
        </CardTitle>
        <CardDescription>Affiché dans l'en-tête et en tête des documents exportés.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="ws-name">Nom de l'entreprise</Label>
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button
          onClick={() => {
            const trimmed = name.trim();
            if (!trimmed) {
              toast.error("Le nom ne peut pas être vide");
              return;
            }
            savePreferences({ workspaceName: trimmed });
            qc.invalidateQueries({ queryKey: ["preferences"] });
            toast.success("Nom enregistré");
          }}
        >
          Enregistrer
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
          La sauvegarde contient toute la base : produits, ventes, lignes et dépenses.
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
                    <li>{pending.summary.expenses} dépense(s)</li>
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
