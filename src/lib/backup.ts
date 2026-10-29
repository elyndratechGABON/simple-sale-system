// Sauvegarde automatique des données : un dossier choisi une fois (File System Access
// sur desktop) ou le meilleur canal disponible (Capacitor Documents / partage /
// Téléchargements), déclenché depuis Écran « Sauvegarder maintenant » ou le rappel
// périodique. La DATE de la dernière sauvegarde reste en localStorage : si la base est
// perdue, la date l'est avec elle — et le rappel s'affiche, exactement ce qu'on veut.
import { buildBackupBlob, backupFilename } from "./exports/json";
import { saveDocument, canPickDirectory, pickDocumentsDirectory, type SaveResult } from "./files";

const LAST_BACKUP_KEY = "last_backup_at";
const BACKUP_INTERVAL_MS = 7 * 86_400_000;

export interface AutoSaveResult {
  result: SaveResult;
  filename: string;
}

/** Date de la dernière sauvegarde connue de CET appareil (0 = jamais). */
export function lastBackupAt(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(LAST_BACKUP_KEY) ?? 0);
}

/** Jours écoulés depuis la dernière sauvegarde (Infinity si jamais). */
export function daysSinceBackup(): number {
  const at = lastBackupAt();
  if (!at) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - at) / 86_400_000));
}

/** La sauvegarde date-t-elle de plus de la période de rappel ? */
export function backupOverdue(): boolean {
  return Date.now() - lastBackupAt() > BACKUP_INTERVAL_MS;
}

export function recordBackup(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
}

/** Le rappel est-il silencieux ? (l'utilisateur a déclenché « Plus tard »). */
export function reminderMuted(): boolean {
  if (typeof window === "undefined") return false;
  const until = Number(window.localStorage.getItem("backup_reminder_muted_until") ?? 0);
  return until > Date.now();
}

/** Dérive le rappel de 3 jours : pas de nag immédiat après un refus. */
export function snoozeBackupReminder(days = 3): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "backup_reminder_muted_until",
    String(Date.now() + days * 86_400_000),
  );
}

/**
 * Configuration de la sauvegarde automatique : le dossier est choisi UNE fois
 * (desktop, File System Access) et mémorisé ; sur mobile la sauvegarde partira par
 * le meilleur canal du moment (Capacitor / partage / Téléchargements).
 *
 * @returns le nom du dossier configuré, ou "" si le picker n'existe pas.
 */
export async function configureAutoSave(): Promise<string | null> {
  if (!canPickDirectory()) return null;
  const name = await pickDocumentsDirectory();
  if (name) recordBackup();
  return name;
}

/** Sauvegarde complète MAINTENANT, par le canal disponible, et date la réussite. */
export async function saveBackupNow(): Promise<AutoSaveResult | null> {
  const blob = await buildBackupBlob();
  const filename = backupFilename();
  const result = await saveDocument(blob, filename);
  // Un "share" annulé retombe déjà en "download" côté files.ts : tout SaveResult
  // renvoyé ici EST une écriture ou un téléchargement réussi.
  recordBackup();
  return { result, filename };
}
