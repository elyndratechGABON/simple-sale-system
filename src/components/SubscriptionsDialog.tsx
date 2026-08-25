// Interface cachée de gestion des abonnements clients, ouverte par 5 appuis sur le logo
// « ECAISSE » de l'en-tête (cf. src/components/Header.tsx). Volontairement absente de la
// navigation : c'est un outil de régie, pas un écran de service.
//
// Fiches clients + statuts : nom, téléphone, formule, montant, dates de la période et
// statut. Le statut est DÉDUIT des dates et du champ `paid` (cf. Subscription dans
// src/lib/db.ts) : « expiré » si la fin est passée, sinon « payé » ou « en attente ».
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  addSubscription,
  deleteSubscription,
  listSubscriptions,
  updateSubscription,
  type Subscription,
} from "@/lib/db";
import { formatDateShort, formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SubscriptionStatus = "payé" | "en attente" | "expiré";

function subscriptionStatus(sub: Subscription): SubscriptionStatus {
  if (sub.endDate <= Date.now()) return "expiré";
  return sub.paid ? "payé" : "en attente";
}

/** `<input type="date">` ↔ horodatage du début de journée locale. */
function toDateInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInput(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

export function SubscriptionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: listSubscriptions,
  });
  // `null` : liste. `"new"` : formulaire vierge. Une fiche : formulaire d'édition.
  const [editing, setEditing] = useState<Subscription | "new" | null>(null);
  // Suppression en deux temps : premier appui → « Confirmer ? », second → suppression.
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["subscriptions"] });
    setConfirmId(null);
  };

  const addMut = useMutation({
    mutationFn: addSubscription,
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast.success("Abonnement enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast.success("Abonnement mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => {
      refresh();
      toast.success("Abonnement supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Abonnements clients
          </DialogTitle>
          <DialogDescription>
            Fiches des clients abonnés : statut payé, en attente ou expiré.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <SubscriptionForm
            initial={editing === "new" ? null : editing}
            busy={addMut.isPending || updateMut.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(sub) => {
              if (editing === "new") addMut.mutate(sub);
              else updateMut.mutate({ ...editing, ...sub });
            }}
          />
        ) : (
          <>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {subscriptions.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucun abonné pour l'instant.
                </p>
              )}
              {subscriptions.map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  sub={sub}
                  confirmDelete={confirmId === sub.id}
                  onDelete={() => {
                    if (confirmId === sub.id) deleteMut.mutate(sub.id);
                    else setConfirmId(sub.id);
                  }}
                  onCancelDelete={() => setConfirmId(null)}
                  onEdit={() => setEditing(sub)}
                  onTogglePaid={() => updateMut.mutate({ ...sub, paid: !sub.paid })}
                />
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => setEditing("new")}
              disabled={addMut.isPending}
            >
              <Plus className="h-4 w-4 mr-2" /> Nouvel abonnement
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Une fiche d'abonné : identité, période, montant, statut et actions. */
function SubscriptionRow({
  sub,
  confirmDelete,
  onDelete,
  onCancelDelete,
  onEdit,
  onTogglePaid,
}: {
  sub: Subscription;
  confirmDelete: boolean;
  onDelete: () => void;
  onCancelDelete: () => void;
  onEdit: () => void;
  onTogglePaid: () => void;
}) {
  const status = subscriptionStatus(sub);
  const variant = status === "expiré" ? "destructive" : status === "payé" ? "default" : "outline";

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{sub.clientName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {sub.phone ? `${sub.phone} · ` : ""}
            {sub.plan}
          </div>
        </div>
        <Badge variant={variant}>{status}</Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground tabular-nums">
          {formatDateShort(sub.startDate)} → {formatDateShort(sub.endDate)}
        </span>
        <span className="font-bold tabular-nums">{formatFCFA(sub.price)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Switch checked={sub.paid} onCheckedChange={onTogglePaid} aria-label="Paiement reçu" />
          Payé
        </label>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9"
            aria-label="Modifier"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {confirmDelete ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-11 sm:h-8"
              onClick={onDelete}
              onMouseLeave={onCancelDelete}
            >
              Confirmer ?
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-destructive sm:h-9 sm:w-9"
              aria-label="Supprimer"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Formulaire d'ajout ou d'édition d'un abonnement. */
function SubscriptionForm({
  initial,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: Subscription | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (sub: Omit<Subscription, "id" | "updated_at" | "deleted_at" | "sync_status">) => void;
}) {
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [plan, setPlan] = useState(initial?.plan ?? "Mensuel");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [startDate, setStartDate] = useState(initial ? toDateInput(initial.startDate) : "");
  const [endDate, setEndDate] = useState(initial ? toDateInput(initial.endDate) : "");
  const [paid, setPaid] = useState(initial?.paid ?? false);

  function submit() {
    const name = clientName.trim();
    const amount = Number(price);
    if (!name) {
      toast.error("Nom du client requis");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Dates de période requises");
      return;
    }
    if (fromDateInput(endDate) < fromDateInput(startDate)) {
      toast.error("La fin de période précède son début");
      return;
    }
    onSubmit({
      clientName: name,
      phone: phone.trim() || undefined,
      plan: plan.trim() || "Mensuel",
      price: amount,
      startDate: fromDateInput(startDate),
      endDate: fromDateInput(endDate),
      paid,
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="sub-name">Nom du client</Label>
          <Input
            id="sub-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex : Awa Ndiaye"
          />
        </div>
        <div>
          <Label htmlFor="sub-phone">Téléphone</Label>
          <Input
            id="sub-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optionnel"
            inputMode="tel"
          />
        </div>
        <div>
          <Label htmlFor="sub-plan">Formule</Label>
          <Input
            id="sub-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Mensuel"
          />
        </div>
        <div>
          <Label htmlFor="sub-price">Montant (FCFA)</Label>
          <Input
            id="sub-price"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="sub-start">Début de période</Label>
          <Input
            id="sub-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sub-end">Fin de période</Label>
          <Input
            id="sub-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <label
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer",
        )}
      >
        <span>
          <span className="block font-medium">Paiement reçu</span>
          <span className="block text-sm text-muted-foreground">La période est réglée.</span>
        </span>
        <Switch checked={paid} onCheckedChange={setPaid} aria-label="Paiement reçu" />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={busy}>
          <Plus className="h-4 w-4 mr-2" /> Enregistrer
        </Button>
      </div>
    </div>
  );
}
