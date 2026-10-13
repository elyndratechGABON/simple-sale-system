// Sauvegarde et restauration : dump COMPLET de la base, pas seulement la période
// affichée. C'est la copie de secours de l'application — un dump partiel serait un
// piège, puisque restaurer efface ce que le fichier ne contient pas.
//
// Le parsing/validation vit ici, l'écriture vit dans src/lib/db.ts : ce module ne touche
// jamais IndexedDB directement, c'est l'invariant de db.ts.
//
// (schema.ts) schémas zod + version de format ; (parse.ts) construction et lecture.
export { BACKUP_FORMAT_VERSION, type BackupFile, type BackupSummary } from "./schema";
export { backupFilename, buildBackupBlob, parseBackup, restoreBackup } from "./parse";
