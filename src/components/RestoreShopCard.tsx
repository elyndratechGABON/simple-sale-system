import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, ShieldCheck } from "lucide-react";
import {
  consumeRestore,
  forgetRestoreJob,
  recallRestoreJob,
  rememberRestoreJob,
  requestRestore,
} from "@/lib/restore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Récupération d'une boutique depuis l'archive de l'orchestrateur.
 *
 * Le libellé est l'essentiel de ce composant. « Aucune donnée » et « pas encore
 * synchronisé » ne se ressemblent pas pour l'utilisateur : le premier est sans issue,
 * le second se débloque en lançant le service. On affiche donc TOUJOURS ce qu'il faut
 * faire, et jamais un constat sec.
 */
type Phase =
  | { kind: "idle" }
  | { kind: "waiting"; message: string }
  | { kind: "restoring"; applied: number; total: number }
  | { kind: "done"; applied: number; total: number }
  | { kind: "error"; message: string };

export function RestoreShopCard() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const run = async () => {
    setPhase({ kind: "waiting", message: "Connexion au service…" });
    try {
      // 1. Demande (ou relance) le job. Le serveur répond `pending` tant que
      // l'orchestrateur n'a pas drainé le relais — donc on le dit, on ne devine pas.
      const req = await requestRestore();
      await rememberRestoreJob(req.job_id);

      if (req.status !== "ready") {
        setPhase({ kind: "waiting", message: req.message });
        return;
      }

      // 2. Rejeu page par page. L'archivage garde l'historique complet : c'est long,
      //    d'où une progression plutôt qu'un spinner nu.
      let last = 0;
      await consumeRestore(req.job_id, (p) => {
        // Ré-afficher à chaque page saturerait React pour rien : une fois sur dix suffit,
        // et la dernière page est toujours rendue.
        if (p.cursor - last >= 10 || p.done) {
          last = p.cursor;
          setPhase({ kind: "restoring", applied: p.applied, total: p.total });
        }
      });

      setPhase({ kind: "done", applied: 0, total: req.total_ops });
      await forgetRestoreJob();
    } catch (err) {
      // Les 503 « BACKUP_KEY absent » et les 403 « pas membre » arrivent ici : le
      // message du serveur est déjà actionnable, on le rend tel quel.
      setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const resume = async () => {
    const jobId = await recallRestoreJob();
    if (!jobId) {
      setPhase({ kind: "idle" });
      return;
    }
    setPhase({ kind: "restoring", applied: 0, total: 0 });
    try {
      await consumeRestore(jobId, (p) =>
        setPhase({ kind: "restoring", applied: p.applied, total: p.total }),
      );
      setPhase({ kind: "done", applied: 0, total: 0 });
      await forgetRestoreJob();
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Récupérer ma boutique
        </CardTitle>
        <CardDescription className="text-xs">
          Téléphone perdu ou réinitialisé ? Vos ventes, produits et stocks sont archivés par le
          service. Relancez l&apos;orchestrateur, puis cliquez ici.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {phase.kind === "idle" && (
          <>
            <Button className="w-full" onClick={run}>
              <Download className="mr-2 h-4 w-4" /> Récupérer mes données
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={resume}>
              Reprendre une récupération
            </Button>
          </>
        )}

        {phase.kind === "waiting" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
            <span>
              {phase.message}
              <span className="mt-1.5 block text-muted-foreground">
                Sans données, ce n&apos;est pas que la boutique est vide : c&apos;est que le
                service n&apos;a pas encore été lancé pour synchroniser. Relancez
                l&apos;orchestrateur, puis cliquez à nouveau.
              </span>
            </span>
          </div>
        )}

        {phase.kind === "restoring" && (
          <div className="flex items-center gap-2 rounded-lg border p-3 text-xs">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span>
              Reconstruction en cours…{" "}
              <span className="tabular-nums">
                {phase.applied} opérations
                {phase.total > 0 && ` / ${phase.total}`}
              </span>
              <span className="mt-1 block text-muted-foreground">
                Gardez l&apos;application ouverte. Vous pouvez interrompre et reprendre.
              </span>
            </span>
          </div>
        )}

        {phase.kind === "done" && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              Boutique restaurée.
              <span className="mt-1 block text-muted-foreground">
                Vos produits et vos ventes sont de retour. Ouvrez l&apos;accueil pour
                vérifier.
              </span>
            </span>
          </div>
        )}

        {phase.kind === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>
              Récupération impossible : {phase.message}
              <span className="mt-1 block text-muted-foreground">
                Vérifiez que le service est lancé et que vous utilisez le téléphone et le
                mot de passe de votre boutique.
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}