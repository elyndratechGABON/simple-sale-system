// Interface cachée de gestion des abonnements clients, ouverte par 5 appuis sur le logo
// « ECAISSE » de l'en-tête (cf. src/components/Header.tsx). Volontairement absente de la
// navigation : c'est un outil de régie, pas un écran de service.
//
// Fiches clients + statuts : nom, téléphone, formule, montant, dates de la période et
// statut. Le statut est DÉDUIT des dates et du champ `paid` (cf. Subscription dans
// src/lib/db.ts) : « expiré » si la fin est passée, sinon « payé » ou « en attente ».
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users } from "lucide-react";
import {
  addSubscription,
  deleteSubscription,
  listSubscriptions,
  updateSubscription,
  type Subscription,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SubscriptionForm } from "./SubscriptionForm";
import { SubscriptionRow } from "./SubscriptionRow";

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
