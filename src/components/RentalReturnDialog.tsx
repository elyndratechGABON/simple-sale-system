// Dialogue de retour de location d'actifs (cluster 'location').
// Ouvre depuis la vue actifs pour enregistrer le retour d'un actif loué :
// état, pénalité de retard, remboursement de caution, notes.
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateRental, useRental, overdueDays, lateFee } from "@/hooks/use-rentals";
import { formatFCFA } from "@/lib/format";
import type { Rental } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Condition = "good" | "damaged" | "lost";

interface RentalReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental;
}

export function RentalReturnDialog({ open, onOpenChange, rental }: RentalReturnDialogProps) {
  const qc = useQueryClient();
  const updateRental = useUpdateRental();
  const { data: current } = useRental(open ? rental.id : null);
  const active = current ?? rental;

  const [condition, setCondition] = useState<Condition | null>(null);
  const [depositRefund, setDepositRefund] = useState(active.deposit);
  const [notes, setNotes] = useState("");

  const isReturned = active.status === "returned";

  const daysOverdue = useMemo(
    () => overdueDays(active.expected_end_date),
    [active.expected_end_date],
  );
  const totalBase = active.price_per_unit * active.quantity;
  const computedLateFee = useMemo(
    () => lateFee(totalBase, active.expected_end_date),
    [totalBase, active.expected_end_date],
  );

  const totalPaid = totalBase;

  const resolvedRefund = useMemo(() => {
    if (!condition) return active.deposit;
    if (condition === "lost") return 0;
    if (condition === "good") return active.deposit;
    return depositRefund;
  }, [condition, active.deposit, depositRefund]);

  const netAmount = resolvedRefund + computedLateFee - active.deposit;

  function handleClose() {
    onOpenChange(false);
    setCondition(null);
    setDepositRefund(active.deposit);
    setNotes("");
  }

  function handleSubmit() {
    if (!condition) return;
    updateRental.mutate(
      {
        ...active,
        actual_end_date: Date.now(),
        status: "returned",
        condition_at_return: condition,
        late_fee: computedLateFee,
        deposit_refund: resolvedRefund,
        notes: notes || active.notes,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["products"] });
          qc.invalidateQueries({ queryKey: ["rentals"] });
          toast.success("Retour enregistré");
          handleClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  function handleConditionChange(c: Condition) {
    setCondition(c);
    if (c === "lost") setDepositRefund(0);
    else setDepositRefund(active.deposit);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isReturned ? "Retour d'actif" : "Enregistrer le retour"}</DialogTitle>
          <DialogDescription>
            {isReturned
              ? "Cet actif a déjà été retourné."
              : "Remplissez les informations de retour de l'actif."}
          </DialogDescription>
        </DialogHeader>

        {isReturned ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Statut</span>
              <Badge>Déjà retourné</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actif</span>
                <span>{active.asset_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span>{active.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de retour</span>
                <span>
                  {active.actual_end_date
                    ? new Date(active.actual_end_date).toLocaleDateString("fr-FR")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition</span>
                <span className="capitalize">{active.condition_at_return ?? "—"}</span>
              </div>
              {active.late_fee != null && active.late_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pénalité de retard</span>
                  <span>{formatFCFA(active.late_fee)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remboursement caution</span>
                <span>{formatFCFA(active.deposit_refund ?? 0)}</span>
              </div>
            </div>
            {active.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes: </span>
                {active.notes}
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Fermer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actif</span>
                <span>{active.asset_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span>{active.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de début</span>
                <span>{new Date(active.start_date).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date prévue de fin</span>
                <span>{new Date(active.expected_end_date).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total payé</span>
                <span>{formatFCFA(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caution versée</span>
                <span>{formatFCFA(active.deposit)}</span>
              </div>
            </div>

            {daysOverdue > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">Retard de {daysOverdue} jour(s)</p>
                <p className="text-destructive/80">Pénalité: {formatFCFA(computedLateFee)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>État de l'actif *</Label>
              <div className="flex gap-2">
                {(["good", "damaged", "lost"] as const).map((c) => (
                  <Button
                    key={c}
                    variant={condition === c ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleConditionChange(c)}
                  >
                    {c === "good" ? "Bon état" : c === "damaged" ? "Endommagé" : "Perdu"}
                  </Button>
                ))}
              </div>
            </div>

            {condition === "damaged" && (
              <div className="space-y-2">
                <Label htmlFor="refund">Remboursement caution (FCFA)</Label>
                <Input
                  id="refund"
                  type="number"
                  min={0}
                  max={active.deposit}
                  value={depositRefund}
                  onChange={(e) => setDepositRefund(Number(e.target.value))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="État, observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {condition && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Pénalité de retard</span>
                  <span>{formatFCFA(computedLateFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remboursement caution</span>
                  <span>{formatFCFA(resolvedRefund)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>{netAmount >= 0 ? "Dû" : "À rembourser"}</span>
                  <span>{formatFCFA(Math.abs(netAmount))}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={updateRental.isPending || !condition}>
                {updateRental.isPending ? "Enregistrement..." : "Enregistrer le retour"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
