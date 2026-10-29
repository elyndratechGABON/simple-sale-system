// Modale des archives financières (mission Étapes 2+4) : la liste des snapshots
// AUTOMATIQUES, du plus récent au plus ancien. Une ligne = date + CA + bénéfice ;
// au CLIC, le détail s'ouvre (produits vendus de la journée, heure de l'archive) —
// les lignes de vente ne sont PAS stockées dans le snapshot (une image figée des
// CHIFFRES seulement), le détail se lit à la source dans l'historique du jour.
// La fréquence d'archivage se choisit ici (préférence locale de l'appareil).
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { formatFCFA, formatTime } from "@/lib/format";
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
  const qc = useQueryClient();
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["financial_snapshots"],
    queryFn: listFinancialSnapshots,
    enabled: open,
  });

  const [frequence, setFrequence] = useState<string>("7");
  useEffect(() => {
    if (open) setFrequence(String(snapshotFrequency()));
  }, [open]);

  const changeMut = useMutation({
    mutationFn: async (days: string) => {
      setFrequence(days);
      setSnapshotFrequency(Number(days));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });

  // Une SEULE archive dépliée à la fois : le détail est un aller-retour IndexedDB,
  // l'empiler sur N lignes renchérirait la modale pour rien.
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) setDetailId(null);
  }, [open]);

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

        {/* Fréquence d'archivage automatique (mission §3) — préférence locale. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Archivage automatique :</span>
          <Select value={frequence} onValueChange={(v) => changeMut.mutate(v)}>
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
              La première archive sera émise au prochain boot, selon la fréquence choisie.
            </p>
          ) : (
            snapshots.map((s) => (
              <SnapshotRow
                key={s.id}
                snapshot={s}
                expanded={detailId === s.id}
                onToggle={() => setDetailId(detailId === s.id ? null : s.id)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SnapshotRow({
  snapshot,
  expanded,
  onToggle,
}: {
  snapshot: FinancialSnapshot;
  expanded: boolean;
  onToggle: () => void;
}) {
  const label = new Date(snapshot.day).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const actif = snapshot.profit >= 0;
  return (
    <div className="rounded-lg border">
      {/* La Ligne entière est le déclencheur du détail : date + CA + bénéfice + PDF. */}
      <div className="flex items-center gap-3 px-3 py-2">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {snapshot.salesCount} vente{snapshot.salesCount > 1 ? "s" : ""} · CA{" "}
            {formatFCFA(snapshot.revenue)}
          </p>
        </button>
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
      {expanded && <SnapshotDetail snapshot={snapshot} label={label} />}
    </div>
  );
}

/**
 * Détail d'une archive (mission §3) : produits vendus de la JOURNÉE, heure de
 * l'archive, panier moyen. Les lignes se lisent depuis l'historique — le snapshot
 * ne transporte QUE les chiffres, dupliquer des ventes en créerait une deuxième
 * source de vérité.
 */
function SnapshotDetail({ snapshot, label }: { snapshot: FinancialSnapshot; label: string }) {
  const { data } = useQuery({
    queryKey: ["sales", "archive", snapshot.day],
    queryFn: async () => {
      const { listSales, getSaleItemsForSales } = await import("@/lib/db");
      const to = snapshot.day + 86_400_000;
      const sales = await listSales(snapshot.day, to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
  });

  return (
    <div className="border-t bg-muted/30 px-3 py-2 space-y-2 text-sm">
      <p className="text-xs text-muted-foreground">
        Archive créée le{" "}
        {new Date(snapshot.created_at).toLocaleString("fr-FR", {
          day: "numeric",
          month: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        · Panier moyen&nbsp;
        <span className="font-medium text-foreground tabular-nums">
          {snapshot.salesCount > 0 ? formatFCFA(snapshot.averageBasket) : "—"}
        </span>
      </p>
      {!data ? (
        <Skeleton className="h-12" />
      ) : data.items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune vente ce jour-là.</p>
      ) : (
        <ul className="space-y-1">
          {data.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate">
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {i.quantity}
                </span>{" "}
                {i.name}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {formatFCFA(i.price_at_sale * i.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">État financier — {label}</p>
    </div>
  );
}
