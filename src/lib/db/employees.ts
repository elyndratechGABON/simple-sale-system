import type { ClusterId } from "../settings";
import { getDB, uid } from "./internal";
import type { EmployeeHistory } from "./types/records";

// ---------- Carnet d'expérience employé ----------
// L'historique des business où cette personne a travaillé, 100 % local. L'identité de
// la PERSONNE (`employeeId`) vit en localStorage : elle n'est PAS une donnée d'appareil,
// ce qui la fait survivre à `purgeAllData` et `resetDeviceIdentity`. Le carnet (table
// `employee_history`, IndexedDB) est dans le même cas — la personne qui supprime son
// compte retrouve ses expériences, puis en ouvre de nouvelles au prochain join.

/** Clé localStorage de l'identité stable de la personne employée. */
export const EMPLOYEE_ID_KEY = "elyndra_employee_id";

/** Identité employé persistante, ou null si cette personne n'a jamais travaillé. */
export function getEmployeeId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(EMPLOYEE_ID_KEY);
  } catch {
    // localStorage inaccessible (mode privé strict) : pas d'identité, carnet vide.
    return null;
  }
}

/** Crée — ou relit — l'identité employé stable. Indépendante du `deviceId` : elle
 *  rattache les entrées du carnet d'un business à l'autre et survit aux purges. */
export function ensureEmployeeId(): string {
  const existing = getEmployeeId();
  if (existing) return existing;
  const id = uid();
  try {
    window.localStorage.setItem(EMPLOYEE_ID_KEY, id);
  } catch {
    // Quota plein ou stockage refusé : l'identité ne survivra pas au rechargement,
    // mais le carnet reste utilisable pour cette session.
  }
  return id;
}

/**
 * Ouvre une expérience au rattachement d'un employé (SetupWizard, mode « join »).
 * Id déterministe : terminer deux fois le même rattachement ne crée pas de doublon —
 * un `put` écrase l'entrée existante au lieu d'en empiler une seconde.
 */
export async function addEmployeeHistory(input: {
  employeeId: string;
  deviceId: string;
  shopId: string;
  storeName: string;
  cluster: ClusterId;
  employeeName?: string;
}): Promise<EmployeeHistory> {
  const startedAt = Date.now();
  const entry: EmployeeHistory = {
    id: `${input.employeeId}|${input.shopId}|${startedAt}`,
    role: "employee",
    ...input,
    startedAt,
    durationDays: 0,
  };
  await getDB().employee_history.put(entry);
  return entry;
}

/** Carnet complet d'une personne, de la dernière expérience à la première. */
export async function listEmployeeHistory(employeeId: string): Promise<EmployeeHistory[]> {
  const rows = await getDB().employee_history.where("employeeId").equals(employeeId).toArray();
  return rows.sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Ferme l'expérience du business `shopId` encore ouverte et pose sa durée (jours
 * entiers). Appelée à la suppression du compte employé, AVANT la purge — le `shopId`
 * n'est lisible qu'ici, dans l'identité encore en place.
 */
export async function closeEmployeeHistory(shopId: string): Promise<void> {
  const db = getDB();
  const rows = await db.employee_history.where("shopId").equals(shopId).toArray();
  const open = rows.find((r) => !r.endedAt);
  if (!open) return;
  const endedAt = Date.now();
  const durationDays = Math.max(1, Math.round((endedAt - open.startedAt) / 86_400_000));
  await db.employee_history.put({ ...open, endedAt, durationDays });
}
