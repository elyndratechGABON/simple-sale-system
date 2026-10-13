import { useState } from "react";
import { Plus } from "lucide-react";
import type { Subscription } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fromDateInput, toDateInput } from "./helpers";

/** Formulaire d'ajout ou d'édition d'un abonnement. */
export function SubscriptionForm({
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
