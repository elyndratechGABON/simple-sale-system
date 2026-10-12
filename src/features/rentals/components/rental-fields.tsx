// Champs de saisie partagés par les deux dialogues de location (réservation, retour).
//
// Extraits parce que les deuxposaient exactement les mêmes libellés, les mêmes bornes et
// le même `inputMode`. Dupliqués, ils divergeiraient : un `<input type="date">` posé à
// deux endroits finit par avoir deux formats, et le vendeur ne sait plus lequel il a
// sous les doigts.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Une période de location : heure, jour, semaine, mois, année. */
export type PricingUnit = "hour" | "day" | "week" | "month" | "year";

export const UNIT_LABELS: Record<PricingUnit, string> = {
  hour: "/heure",
  day: "/jour",
  week: "/semaine",
  month: "/mois",
  year: "/an",
};

/** Ordre d'affichage des périodes : la plus courante d'abord. Un actif qui facture le
 *  jour ET l'heure propose « jour » en premier — c'est le tarif que le vendeur tape. */
export const UNIT_PRIORITY: PricingUnit[] = ["day", "hour", "week", "month", "year"];

/**
 * Choix de la période tarifée + tarif unitaire.
 *
 * Les deux vont ensemble : changer de période recharge le tarif correspondant, donc les
 * séparer laisserait un tarif de jour affiché sous une unité heure. L'exemple chiffré
 * (« 35 000 FCFA/jour → 1 mois = 1 050 000 ») est là pour que le vendeur n'applique pas
 * un tarif horaire à une facture mensuelle.
 */
export function PricingPicker({
  availableUnits,
  pricingUnit,
  onUnit,
  pricePerUnit,
  onPrice,
}: {
  availableUnits: PricingUnit[];
  pricingUnit: PricingUnit;
  onUnit: (u: PricingUnit) => void;
  pricePerUnit: string;
  onPrice: (v: string) => void;
}) {
  return (
    <>
      {availableUnits.length > 0 && (
        <div className="flex gap-1.5">
          {availableUnits.map((u) => (
            <Button
              key={u}
              size="sm"
              variant={pricingUnit === u ? "default" : "outline"}
              className="flex-1"
              onClick={() => onUnit(u)}
            >
              {UNIT_LABELS[u]}
            </Button>
          ))}
        </div>
      )}
      <div>
        <Label htmlFor="rental-price">
          Tarif unitaire — par {UNIT_LABELS[pricingUnit].toLowerCase()} (FCFA)
        </Label>
        <div className="text-xs text-muted-foreground mb-1">
          Ex : 35 000 FCFA/jour → 1 mois = 35 000 × 30 = 1 050 000 FCFA
        </div>
        <Input
          id="rental-price"
          value={pricePerUnit}
          onChange={(e) => onPrice(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="0"
        />
      </div>
    </>
  );
}

export function DateField({
  id,
  label,
  value,
  onChange,
  min,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
    </div>
  );
}

/**
 * Quantité d'unités louées.
 *
 * `step` suit l'unité : par jour on loue desbriens entiers, à l'heure on peut prendre
 * une demi-heure. Le champ reste numérique dans les deux cas.
 */
export function QtyField({
  id,
  label,
  value,
  onChange,
  step = 1,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  max?: number;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        step={step}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="mt-1"
      />
    </div>
  );
}

export function MoneyField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={required}
        className="mt-1"
      />
    </div>
  );
}
