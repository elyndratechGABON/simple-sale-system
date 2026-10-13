import type { Subscription } from "@/lib/db";

export type SubscriptionStatus = "payé" | "en attente" | "expiré";

export function subscriptionStatus(sub: Subscription): SubscriptionStatus {
  if (sub.endDate <= Date.now()) return "expiré";
  return sub.paid ? "payé" : "en attente";
}

/** `<input type="date">` ↔ horodatage du début de journée locale. */
export function toDateInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateInput(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}
