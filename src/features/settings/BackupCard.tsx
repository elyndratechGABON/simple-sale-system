import { useRef, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FolderSync, HardDriveDownload, Save, Upload } from "lucide-react";
import {
  backupFilename,
  buildBackupBlob,
  parseBackup,
  restoreBackup,
  type BackupSummary,
} from "@/lib/exports/json";
import { configureAutoSave, daysSinceBackup, recordBackup, saveBackupNow } from "@/lib/backup";
import { canPickDirectory, getDocumentsDirectoryName } from "@/lib/files";
import type { DatabaseSnapshot } from "@/lib/db";
import { describeSaveResult, saveDocument } from "@/lib/files";
import { RestoreShopCard } from "@/components/RestoreShopCard";
import { Button } from "@/components/ui/button";
import { PersistenceBadge } from "@/components/PersistenceBanner";
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
import { toast } from "sonner";

export function BackupCard() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  // Le fichier est validé AVANT toute écriture, et le résumé est affiché à l'utilisateur
  // pour qu'il confirme en connaissance de cause : la restauration écrase tout.
  const [pending, setPending] = useState<{
    snapshot: DatabaseSnapshot;
    summary: BackupSummary;
  } | null>(null);
  // Dossier configuré pour la sauvegarde automatique (desktop), nom affiché.
  const [dossier, setDossier] = useState<string | null>(null);
  const [derniereJours, setDerniereJours] = useState<number | null>(null);

  // Nom du dossier et date de la dernière sauvegarde : lus HORS du rendu (SSR).
  useEffect(() => {
    void getDocumentsDirectoryName().then(setDossier);
    const d = daysSinceBackup();
    setDerniereJours(Number.isFinite(d) ? d : null);
  }, []);

  function majEtat() {
    const d = daysSinceBackup();
    setDerniereJours(Number.isFinite(d) ? d : null);
  }

  async function configurerAuto() {
    const name = await configureAutoSave();
    if (name) {
      setDossier(name);
      majEtat();
      toast.success(`Sauvegarde automatique configurée dans « ${name} ».`);
    }
  }

  const autoSaveMut = useMutation({
    mutationFn: () => saveBackupNow(),
    onSuccess: (saved) => {
      if (!saved) return;
      toast.success(describeSaveResult(saved.result, saved.filename));
      majEtat();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const blob = await buildBackupBlob();
      const filename = backupFilename();
      return { result: await saveDocument(blob, filename), filename };
    },
    // Le CTA manuel date aussi la sauvegarde : export et auto partagent la même horloge.
    onSuccess: ({ result, filename }) => {
      recordBackup();
      majEtat();
      toast.success(describeSaveResult(result, filename));
    },
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
    <div className="flat-card space-y-4">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <Save className="h-5 w-5" /> Sauvegarde et restauration
        </h2>
        <p className="text-small text-muted-foreground">
          {derniereJours === null
            ? "Aucune sauvegarde sur cet appareil."
            : `Dernière sauvegarde : il y a ${derniereJours} jour${derniereJours > 1 ? "s" : ""}.`}
        </p>
      </header>

      {/* État du STOCKAGE (badge réactif, cf. mission sauvegarde auto — Étape 1). */}
      <div className="flex flex-wrap items-center gap-2">
        <PersistenceBadge />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          aria-busy={saveMut.isPending}
        >
          <Save className="h-4 w-4 mr-2" /> Sauvegarder
        </Button>
        <Button
          variant="outline"
          onClick={() => autoSaveMut.mutate()}
          disabled={autoSaveMut.isPending}
        >
          <HardDriveDownload className="h-4 w-4 mr-2" /> Sauvegarder maintenant
        </Button>
        {/* File System Access est desktop-only : sur téléphone le bouton se cache,
            le canal automatique (Capacitor/partage/téléchargement) prend le relais. */}
        {canPickDirectory() && (
          <Button variant="outline" onClick={() => void configurerAuto()}>
            <FolderSync className="h-4 w-4 mr-2" />
            {dossier ? `Dossier : ${dossier}` : "Configurer la sauvegarde automatique"}
          </Button>
        )}
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
      <p className="text-small text-muted-foreground">
        Les préférences (nom, couleur, dossier, PIN) ne sont pas incluses : elles sont propres à cet
        appareil.
      </p>

      {/* La RESTAURATION SERVEUR : la copie d'archive de l'orchestrateur. C'est le
          filet quand le téléphone a perdu ses données (suppression, vol, changement
          d'appareil) — le fichier ci-dessus, lui, suppose qu'on a un fichier sous la
          main. Les deux ne se confondent pas : l'un part de l'archive du serveur,
          l'autre d'un fichier de l'appareil. */}
      <div className="rounded-xl border-amber-500/30 bg-amber-500/5 p-3">
        <RestoreShopCard />
      </div>

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
                  <ul className="text-body space-y-0.5">
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
              aria-busy={restoreMut.isPending}
            >
              Remplacer mes données
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
