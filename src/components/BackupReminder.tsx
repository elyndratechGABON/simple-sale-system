import { useEffect, useState } from "react";
import { CloudUpload, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  backupOverdue,
  daysSinceBackup,
  reminderMuted,
  saveBackupNow,
  snoozeBackupReminder,
} from "@/lib/backup";

/**
 * Rappel « pensez à sauvegarder » : le stockage persistant n'est pas un chèque en
 * blanc (un formatage, un changement de téléphone effacent la base malgré la
 * protection) — la seule perte évitable est une sauvegarde FRAÎCHE.
 *
 * Monté une seule fois par session : bandeau si la dernière sauvegarde date de
 * plus de 7 jours (jamais de sauvegarde = toujours), décalé de 3 jours quand
 * l'utilisateur décline (« Plus tard »). La date vit en localStorage : si la base
 * est perdue, la date l'est avec elle — le rappel revient. Voulu.
 */
export function BackupReminder() {
  /** `null` = pas de rappel (l'état est SSR-sûr : lu après montée uniquement). */
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (!backupOverdue() || reminderMuted()) return;
    const d = daysSinceBackup();
    setDays(Number.isFinite(d) ? d : null);
  }, []);

  async function sauvegarder() {
    const saved = await saveBackupNow();
    if (!saved) return;
    toast.success(`Sauvegardé : ${saved.filename}`);
    setDays(null);
  }

  function plusTard() {
    snoozeBackupReminder();
    setDays(null);
  }

  if (days === null) return null;

  return (
    <div className="w-full bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center justify-center gap-2 flex-wrap">
      <LifeBuoy className="h-4 w-4 shrink-0" />
      <span>
        {days > 0
          ? `Pensez à sauvegarder vos données (dernière sauvegarde : il y a ${days} jour${days > 1 ? "s" : ""}).`
          : "Pensez à sauvegarder vos données — aucune sauvegarde sur cet appareil."}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0"
        onClick={() => void sauvegarder()}
      >
        <CloudUpload className="h-3.5 w-3.5 mr-1" /> Sauvegarder maintenant
      </Button>
      <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={plusTard}>
        Plus tard
      </Button>
    </div>
  );
}
