import type { PaymentMethod } from "@/lib/db";

export const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

// Moyens de paiement proposés au comptoir. Les tables restent en espèces : c'est le
// serveur qui encaisse et rend la monnaie, pas un terminal.
export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Espèces" },
];

export function paymentLabel(m: PaymentMethod): string {
  return PAYMENT_METHODS.find((x) => x.id === m)?.label ?? "Espèces";
}
