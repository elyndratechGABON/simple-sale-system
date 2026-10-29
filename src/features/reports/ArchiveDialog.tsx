// Modale des archives financières (mission archives, Étapes 2+4) : la liste des
// snapshots AUTOMATIQUES, du plus récent au plus ancien, chacun téléchargeable en
// PDF — et la fréquence d'archivage choisie ici (la préférence vit sur l'appareil).
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/lib/format";
import {
  SNAPSHOT_OPTIONS,
  downloadFinancialSnapshotPdf,
  listFinancialSnapshots,
  setSnapshotFrequency,
  snapshotFrequency,
} from "@/lib/financial/archives";
import type { FinancialSnapshot } from "@/lib/db";

export function ArchiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Une SEULE requête, sur la même clé que le texte d'explication : montée du dialogue
  // = refetch (une archive émise au boot doit y apparaître SANS recharge de page).
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["financial_snapshots"],
    queryFn: listFinancialSnapshots,
    enabled: open,
  });

  const [frequence, setFrequence] = useState<string>("7");
  useEffect(() => {
    if (open) setFrequence(String(snapshotFrequency()));
  }, [open]);

  async function changerFrequence(days: string) {
    setFrequence(days);
    setSnapshotFrequency(Number(days));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" /> États financiers passés
          </DialogTitle>
          <DialogDescription>
            Archives automatiques de l&apos;appareil : une image figée des chiffres du jour,
            téléchargeable en PDF.
          </DialogDescription>
        </DialogHeader>

        {/* Fréquence d'archivage automatique (mission §3) — la préférence vit sur
            l'appareil : chaque commerce ar-archive selon son rythme. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Archivage automatique :</span>
          <Select value={frequence} onValueChange={(v) => void changerFrequence(v)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SNAPSHOT_OPTIONS.map((o) => (
                <SelectItem key={o.days} value={String(o.days)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-16" />
          ) : snapshots.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              La première archive estará émise au prochain boot (le lendemain, selon la fréquence
              choisie).
            </p>
          ) : (
            snapshots.map((s) => <SnapshotRow key={s.id} snapshot={s} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SnapshotRow({ snapshot }: { snapshot: FinancialSnapshot }) {
  const d = new Date(snapshot.day);
  const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const actif = snapshot.profit >= 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {snapshot.salesCount} vente{snapshot.salesCount > 1 ? "s" : ""} ·{" "}
          {formatFCFA(snapshot.revenue)}
        </p>
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums whitespace-nowrap",
          actif ? "text-primary" : "text-destructive",
        )}
      >
        {formatFCFA(snapshot.profit)}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0"
        onClick={() => downloadFinancialSnapshotPdf(snapshot)}
        aria-label={`Télécharger le PDF de ${label}`}
      >
        <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
      </Button>
    </div>
  );
}
