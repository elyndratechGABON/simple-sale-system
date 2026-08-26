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
} from "@/hooks/use-rentals";
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
import { toast } from "sonner";

type PricingUnit = "hour" | "day" | "week" | "month";

const UNIT_LABELS: Record<PricingUnit, string> = {
  hour: "Heure",
  day: "Jour",
  week: "Semaine",
  month: "Mois",
};

/** Ordre de préférence pour l'unité par défaut. */
const UNIT_PRIORITY: PricingUnit[] = ["day", "hour", "week", "month"];

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

  const availableUnits = useMemo(() => {
    const p = asset.rental_pricing ?? {};
    return UNIT_PRIORITY.filter((u) => p[u] != null && p[u]! > 0) as PricingUnit[];
  }, [asset.rental_pricing]);

  const [pricingUnit, setPricingUnit] = useState<PricingUnit>("day");
  const [pricePerUnit, setPricePerUnit] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [deposit, setDeposit] = useState(String(asset.deposit_amount ?? 0));
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Sélectionner la meilleure unité à l'ouverture
  useEffect(() => {
    if (!open) return;
    const best = availableUnits[0] ?? "day";
    setPricingUnit(best);
    setPricePerUnit(String(asset.rental_pricing?.[best] ?? 0));
    setQuantity("1");
    setDeposit(String(asset.deposit_amount ?? 0));
    setStartDate(todayISO());
    setEndDate("");
    setClientName("");
    setClientPhone("");
    setNotes("");
  }, [open, asset, availableUnits]);

  const startTs = startDate ? fromDateInput(startDate) : 0;
  const endTs = endDate ? fromDateInput(endDate) : 0;

  const { data: availability } = useAssetAvailability(
    asset.id,
    startTs || Date.now(),
    endTs || Date.now() + 86_400_000,
  );

  const qtyNum = Math.max(1, Math.floor(Number(quantity) || 1));
  const priceNum = Math.max(0, Number(pricePerUnit) || 0);
  const total = useMemo(
    () =>
      startTs && endTs && endTs > startTs
        ? rentalTotal(priceNum, qtyNum, startTs, endTs, pricingUnit)
        : 0,
    [priceNum, qtyNum, startTs, endTs, pricingUnit],
  );
  const units = useMemo(
    () => (startTs && endTs && endTs > startTs ? unitsBetween(startTs, endTs, pricingUnit) : 0),
    [startTs, endTs, pricingUnit],
  );

  const isAvailable = availability != null ? availability.available > 0 : true;
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
          {/* Unité de tarification */}
          {availableUnits.length > 0 && (
            <div className="flex gap-1.5">
              {availableUnits.map((u) => (
                <Button
                  key={u}
                  size="sm"
                  variant={pricingUnit === u ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setPricingUnit(u);
                    setPricePerUnit(String(asset.rental_pricing?.[u] ?? 0));
                  }}
                >
                  {UNIT_LABELS[u]}
                </Button>
              ))}
            </div>
          )}

          {/* Tarif unitaire */}
          <div>
            <Label htmlFor="rental-price">Tarif unitaire (FCFA)</Label>
            <Input
              id="rental-price"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="0"
            />
          </div>

          {/* Quantité */}
          <div>
            <Label htmlFor="rental-qty">Quantité</Label>
            <Input
              id="rental-qty"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="1"
            />
          </div>

          {/* Caution */}
          <div>
            <Label htmlFor="rental-deposit">Caution (FCFA)</Label>
            <Input
              id="rental-deposit"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="0"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rental-start">Début</Label>
              <Input
                id="rental-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rental-end">Fin prévue</Label>
              <Input
                id="rental-end"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
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
          <div>
            <Label htmlFor="rental-client">Nom du client</Label>
            <Input
              id="rental-client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex : Moussa Diop"
            />
          </div>
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
