import { PosDatabase } from "./schema/database";
import type { Sale } from "./types/sales";
import type { SyncFields } from "./types/sync";

let instance: PosDatabase | null = null;

export function getDB(): PosDatabase {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB only available in the browser");
  }
  if (!instance) instance = new PosDatabase();
  return instance;
}

/** Pour les tests uniquement : ferme la base et oublie l'instance, pour repartir d'un
 *  état vierge entre deux scénarios (le singleton `instance` n'existe pas en production). */
export async function resetDBForTests(): Promise<void> {
  const db = instance;
  instance = null;
  if (db) await db.delete();
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/** Champs de synchronisation d'un enregistrement qu'on vient d'écrire. */
export const touch = (): SyncFields => ({ updated_at: Date.now(), sync_status: "local" });

/** Entier ≥ 1, jamais NaN : `Math.max(1, NaN)` laisserait passer NaN dans les sommes. */
export const clampPositiveInt = (v: number): number =>
  Number.isFinite(v) ? Math.max(1, Math.round(v)) : 1;

/** Filtre des enregistrements non supprimés. Toute lecture publique passe par là. */
export const alive = <T extends SyncFields>(rows: T[]): T[] => rows.filter((r) => !r.deleted_at);

/**
 * Filtre des ventes RÉELLEMENT ENCAISSÉES. Jumeau d'`alive()`, et aussi obligatoire.
 *
 * Une addition de table ouverte est une vente en base dont l'argent n'est pas dans la
 * caisse. La laisser passer la ferait compter en chiffre d'affaires : revenus, marge,
 * panier moyen et exports gonfleraient d'un montant que personne n'a payé — sans erreur
 * visible nulle part. `listSales()` est l'entonnoir unique de l'historique ET des
 * rapports (`usePeriodData`, `getProfitToday`) : le filtre y est posé une fois, pour
 * tous les lecteurs présents et futurs.
 *
 * Les additions en cours ne se lisent que par `listOpenTables()`, dont le nom dit ce
 * qu'il rend.
 */
export const paid = (rows: Sale[]): Sale[] => rows.filter((s) => s.status !== "open");

export function startOfToday(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}
