import { getIdentity } from "../identity";
import type { DeviceRole } from "../types";

export const ROLE_LABELS: Record<DeviceRole, string> = {
  owner: "Propriétaire",
  employee: "Employé",
};

/** Rôle local. Par défaut `owner` : c'est le principal qui affiche le code. */
export function getIdentityRole(): DeviceRole {
  return getIdentity().role;
}

export function isOwnerIdentity(): boolean {
  return getIdentity().role === "owner";
}
