// Dialog « Équipe » : liste des appareils du compte marchand (propriétaire, employés). Accessible depuis l'icône Users dans le header — owner only.
//
// Chaque ligne affiche le nom de l'appareil (`device_name` — le nom de l'employé pour
// une caisse employé), le rôle (badge coloré) et le dernier contact (`last_seen`).
// Cliquer sur un écran approuvé ouvre ses RÉSULTATS : ses ventes sur la période choisie,
// filtrées par `seller_device_id` (ou par nom pour les ventes antérieures au suivi) —
// le propriétaire voit ses ventes directes (aucun vendeur attaché). Les appareils en
// attente d'approbation sont signalés séparément avec un bouton « Approuver ».
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Clock,
  MonitorSmartphone,
  Receipt,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { listSales } from "@/lib/db";
import type { Sale } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { approveDevice, ROLE_LABELS } from "@/lib/syncengine/pairing";
import type { PairedDevice, DeviceRole } from "@/lib/syncengine/types";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Début du mois courant (fenêtre par défaut du détail). */
function monthStart(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Badge coloré selon le rôle. */
function RoleBadge({ role }: { role?: DeviceRole }) {
  if (!role || role === "owner") {
    return (
      <Badge variant="default" className="bg-primary text-primary-foreground gap-1">
        <BadgeCheck className="h-3 w-3" />
        {ROLE_LABELS.owner}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      {ROLE_LABELS.employee}
    </Badge>
  );
}

/** Formate le dernier contact en texte relatif. */
function lastSeenLabel(ts?: number): string {
  if (!ts) return "Jamais";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return `Il y a ${Math.floor(diff / 86_400_000)} j`;
}

/**
 * Les ventes d'un écran : son `seller_device_id` exact, ou, pour les ventes
 * antérieures au suivi d'appareil, le nom du vendeur égal au nom de l'écran.
 * Une caisse propriétaire vend « direct » (aucun vendeur attaché).
 */
function isOwnSale(sale: Sale, device: PairedDevice): boolean {
  if (device.role === "owner") return !sale.seller_device_id;
  return (
    sale.seller_device_id === device.id ||
    (!sale.seller_device_id &&
      Boolean(sale.seller_name) &&
      sale.seller_name?.trim() === device.device_name?.trim())
  );
}

export function TeamDialog({ open, onOpenChange }: TeamDialogProps) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    enabled: open,
  });
  const { data: peers } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    enabled: open && Boolean(identity),
    staleTime: 10_000,
  });

  const allDevices = peers ?? [];
  const pending = allDevices.filter((d) => d.status === "pending");
  const paired = allDevices.filter((d) => d.status !== "pending");

  const selected = paired.find((d) => d.id === selectedId) ?? null;

  // Trier : owner en premier, puis employés, puis pending.
  const roleOrder: Record<string, number> = { owner: 0, employee: 1 };
  const sorted = [...paired].sort(
    (a, b) => (roleOrder[a.role ?? "employee"] ?? 9) - (roleOrder[b.role ?? "employee"] ?? 9),
  );

  async function approve(peerId: string) {
    await approveDevice(peerId, "employee");
    await qc.invalidateQueries({ queryKey: ["paired_devices"] });
    toast.success("Écran approuvé — rôle employé.");
  }

  function close() {
    setSelectedId(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {selected ? (
            <DialogTitle className="flex items-center gap-2 text-base">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Retour à l'équipe"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <UserRound className="h-5 w-5 text-primary" />
              <span className="truncate">{selected.device_name || "Écran sans nom"}</span>
              <RoleBadge role={selected.role} />
            </DialogTitle>
          ) : (
            <>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Équipe
              </DialogTitle>
              <DialogDescription>
                Appareils connectés à la boutique. Le propriétaire voit tous les écrans du compte.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {selected ? (
          <EmployeeResults device={selected} />
        ) : (
          <div className="space-y-3">
            {/* Écrans approuvés */}
            {sorted.length > 0 ? (
              <div className="space-y-2">
                {sorted.map((d) => (
                  <TeamRow
                    key={d.id}
                    device={d}
                    isOwnerDevice={d.role === "owner"}
                    onClick={() => setSelectedId(d.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun appareil synchronisé pour l'instant.
              </p>
            )}

            {/* En attente d'approbation */}
            {pending.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  En attente d'approbation ({pending.length})
                </p>
                {pending.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-accent/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {d.device_name || "Écran inconnu"}
                      </p>
                      <p className="text-xs text-muted-foreground">{d.id.slice(0, 8)}…</p>
                    </div>
                    <Button type="button" size="sm" onClick={() => void approve(d.id)}>
                      Approuver
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {paired.length > 0
                ? `${paired.length} écran${paired.length > 1 ? "s" : ""} actif${paired.length > 1 ? "s" : ""}`
                : "Partagez votre boutique via Réglages → Appareils → Ajouter un appareil."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeamRow({
  device,
  isOwnerDevice,
  onClick,
}: {
  device: PairedDevice;
  isOwnerDevice: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {device.device_name || "Écran sans nom"}
          {isOwnerDevice && <span className="ml-1.5 text-xs text-muted-foreground">(vous)</span>}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {lastSeenLabel(device.last_seen)}
        </p>
      </div>
      <RoleBadge role={device.role} />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/** Résultats d'un écran : CA et ventes sur la période, filtrés par vendeur. */
function EmployeeResults({ device }: { device: PairedDevice }) {
  const [range, setRange] = useState<"day" | "week" | "month">("month");

  const from =
    range === "day"
      ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
      : range === "week"
        ? Date.now() - 7 * 86400_000
        : monthStart();

  const { data: sales } = useQuery({
    queryKey: ["team_activity", device.id, from],
    queryFn: () => listSales(from, Date.now()),
    staleTime: 10_000,
  });

  const ownSales = (sales ?? []).filter((s) => isOwnSale(s, device));
  const revenue = ownSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-3">
      {/* Sélecteur de période */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { k: "day", label: "Aujourd'hui" },
            { k: "week", label: "7 jours" },
            { k: "month", label: "Ce mois" },
          ] as const
        ).map(({ k, label }) => (
          <button
            key={k}
            type="button"
            onClick={() => setRange(k)}
            className={[
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              range === k
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Total de la période */}
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground">Total encaissé</p>
          <p className="text-xl font-bold tabular-nums">{formatFCFA(revenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Ventes</p>
          <p className="text-xl font-bold tabular-nums">{ownSales.length}</p>
        </div>
      </div>

      {/* Ventes de l'écran */}
      {ownSales.length > 0 ? (
        <div className="space-y-1.5">
          {ownSales.slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <Receipt className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.timestamp).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {s.client_name ? ` · ${s.client_name}` : ""}
                </span>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatFCFA(s.total)}</span>
            </div>
          ))}
          {ownSales.length > 10 && (
            <p className="text-xs text-muted-foreground">
              +{ownSales.length - 10} autre{ownSales.length - 10 > 1 ? "s" : ""} vente
              {ownSales.length - 10 > 1 ? "s" : ""} sur la période.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-6 text-center">
          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune vente sur cette période.</p>
        </div>
      )}
    </div>
  );
}
