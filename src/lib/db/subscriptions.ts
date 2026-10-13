import { alive, getDB, touch, uid } from "./internal";
import type { Subscription } from "./types/records";
import type { SyncFields } from "./types/sync";

// ---------- Abonnements ----------
// Fiches d'abonnés, créées depuis l'interface cachée (5 appuis sur le logo ECAISSE). Les
// suppressions sont logiques comme partout (`alive()` filtre). Tri par échéance : c'est
// la colonne vertébrale de l'écran — les renouvellements à venir en premier, les plus
// en retard tout en haut.

export async function listSubscriptions(): Promise<Subscription[]> {
  const all = await getDB().subscriptions.toArray();
  return alive(all).sort((a, b) => a.endDate - b.endDate);
}

export async function addSubscription(
  s: Omit<Subscription, "id" | keyof SyncFields>,
): Promise<Subscription> {
  const sub: Subscription = { ...s, id: uid(), ...touch() };
  await getDB().subscriptions.put(sub);
  return sub;
}

export async function updateSubscription(s: Subscription): Promise<void> {
  await getDB().subscriptions.put({ ...s, ...touch() });
}

export async function deleteSubscription(id: string): Promise<void> {
  const db = getDB();
  const sub = await db.subscriptions.get(id);
  if (!sub) return;
  await db.subscriptions.put({ ...sub, ...touch(), deleted_at: Date.now() });
}
