// Dialogue de réservation de location d'actifs (cluster 'location').
// Ouvre depuis la vue actifs pour créer une location avec choix d'unité, tarif,
// quantité, caution, dates et calcul du total.
import { useEffect, useMemo, useState } from "react";
import { Car } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useCreateRental,
  useAssetAvailability,
  rentalTotal,
  unitsBetween,
} from "@/features/rentals/hooks/use-rentals";
import { formatFCFA } from "@/lib/format";
import type { Product } from "@/lib/db";
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
import {
  DateField,
  MoneyField,
  PricingPicker,
  QtyField,
  TextField,
  UNIT_LABELS,
  type PricingUnit,
} from "./rental-fields";
import { toast } from "sonner";
import { useBookingForm } from "../hooks/use-booking-form";

/** Ordre de préférence pour l'unité par défaut. */
const UNIT_PRIORITY: PricingUnit[] = ["day", "hour", "week", "month", "year"];

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInput(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

function toDateInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RentalBookingDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: Product;
}) {
  const qc = useQueryClient();
  const createRental = useCreateRental();

  const {
    availableUnits,
    pricingUnit,
    setPricingUnit,
    pricePerUnit,
    setPricePerUnit,
    quantity,
    setQuantity,
    deposit,
    setDeposit,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    notes,
    setNotes,
    startTs,
    endTs,
    qtyNum,
    priceNum,
    total,
    units,
    isAvailable,
    canSubmit,
  } = useBookingForm(asset, open);

  const busy = createRental.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function submit() {
    if (!clientName.trim()) {
      toast.error("Nom du client requis");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Dates de location requises");
      return;
    }
    if (endTs <= startTs) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    if (units <= 0) {
      toast.error("Durée invalide");
      return;
    }
    if (total <= 0) {
      toast.error("Montant total invalide");
      return;
    }
    if (!isAvailable) {
      toast.error("Actif non disponible sur cette période");
      return;
    }

    createRental.mutate(
      {
        asset_id: asset.id,
        asset_name: asset.name,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        pricing_unit: pricingUnit,
        price_per_unit: priceNum,
        quantity: qtyNum,
        deposit: Math.max(0, Number(deposit) || 0),
        start_date: startTs,
        expected_end_date: endTs,
        status: "active",
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["products"] });
          qc.invalidateQueries({ queryKey: ["rentals"] });
          toast.success("Location enregistrée");
          handleClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" /> Nouvelle location
          </DialogTitle>
          <DialogDescription>
            {asset.name} —{" "}
            {asset.total_units != null ? `${asset.total_units} unité(s) disponible(s)` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <PricingPicker
            availableUnits={availableUnits}
            pricingUnit={pricingUnit}
            onUnit={(u) => {
              setPricingUnit(u);
              setPricePerUnit(String(asset.rental_pricing?.[u] ?? 0));
            }}
            pricePerUnit={pricePerUnit}
            onPrice={setPricePerUnit}
          />

          {/* Quantité */}
          <QtyField id="rental-qty" label="Quantité" value={quantity} onChange={setQuantity} />

          {/* Caution */}
          <MoneyField
            id="rental-deposit"
            label="Caution (FCFA)"
            value={deposit}
            onChange={setDeposit}
            placeholder="0"
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <DateField id="rental-start" label="Début" value={startDate} onChange={setStartDate} />
            <DateField
              id="rental-end"
              label="Fin prévue"
              value={endDate}
              onChange={setEndDate}
              min={startDate || undefined}
            />
          </div>

          {/* Disponibilité */}
          {startTs && endTs && endTs > startTs && (
            <Badge variant={isAvailable ? "default" : "destructive"}>
              {isAvailable ? "Disponible" : "Non disponible"}
            </Badge>
          )}

          {/* Total */}
          {units > 0 && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  {formatFCFA(priceNum)} × {qtyNum} × {units}{" "}
                  {UNIT_LABELS[pricingUnit].toLowerCase()}(s)
                </span>
                <span className="font-bold text-foreground tabular-nums">{formatFCFA(total)}</span>
              </div>
            </div>
          )}

          {/* Client */}
          <TextField
            id="rental-client"
            label="Nom du client"
            value={clientName}
            onChange={setClientName}
            placeholder="Ex : Moussa Diop"
          />
          <div>
            <Label htmlFor="rental-phone">Téléphone</Label>
            <Input
              id="rental-phone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Optionnel"
              inputMode="tel"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="rental-notes">Notes</Label>
            <textarea
              id="rental-notes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !clientName.trim() || !startDate || !endDate || total <= 0}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
