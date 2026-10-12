// État et calculs du formulaire de réservation.
//
// Extrait du dialogue parce que ce n'est pas de l'affichage : neuf champs, une remise à
// zéro à l'ouverture, une disponibilité, un total. Mélangé au JSX, ce bloc faisait 240
// lignes dont la moitié ne dessinait rien.
//
// Le calcul du total est ici et pas dans le composant : il utilise `rentalTotal` (la
// même fonction que les rapports), donc une divergence entre la facture affichée et le
// chiffre comptabilisé serait impossible.

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/db";
import { rentalTotal, unitsBetween } from "../lib/rentals";
import { useAssetAvailability } from "./use-rentals";
import { UNIT_PRIORITY, type PricingUnit } from "../components/rental-fields";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `<input type="date">` donne `YYYY-MM-DD`, qui interprété en UTC décale d'un jour
 *  selon le fuseau. On force minuit local pour que la date affichée soit celle cliquée. */
export function fromDateInput(value: string): number {
  return new Date(value + "T00:00:00").getTime();
}

export function toDateInput(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function useBookingForm(asset: Product, open: boolean) {
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

  // Remise à zéro complète à l'ouverture : sans ça, le nom du client précédent et la
  // période précédente réapparaissent, et le vendeur valide une location au mauvais
  // client sans le voir.
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

  const hasRange = Boolean(startTs && endTs && endTs > startTs);
  const total = useMemo(
    () => (hasRange ? rentalTotal(priceNum, qtyNum, startTs, endTs, pricingUnit) : 0),
    [hasRange, priceNum, qtyNum, startTs, endTs, pricingUnit],
  );
  const units = useMemo(
    () => (hasRange ? unitsBetween(startTs, endTs, pricingUnit) : 0),
    [hasRange, startTs, endTs, pricingUnit],
  );

  return {
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
    isAvailable: availability != null ? availability.available > 0 : true,
    /** Le bouton « Enregistrer » est désactivé tant qu'un de ces quatre manque. */
    canSubmit: Boolean(clientName.trim()) && Boolean(startDate) && Boolean(endDate) && total > 0,
  };
}
