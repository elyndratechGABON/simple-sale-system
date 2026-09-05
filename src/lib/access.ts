// Droits d'accès des écrans selon leur rôle d'appareil (owner / employee).
//
// Source de vérité unique pour ce que chaque rôle peut ouvrir. L'UI (navigation)
// et la garde de route (redirection dans _app) lisent toutes deux ici, pour qu'une
// règle ne vive qu'une fois.
//
// Portée : le rôle est POSÉ SUR L'APPAREIL (DeviceRole, syncengine) — employer un
// « gestionnaire » flotte selon l'appareil qui le porte, pas selon un compte humain.
// L'accès reste donc un réglage par caisse, pas une authentification.
import type { DeviceRole } from "./syncengine/types";

/** Routes ouvertes à chaque rôle. Le propriétaire n'a pas de liste : il ouvre tout.
 *  `/settings` est limité côté employé à UN panneau (demande de suppression de compte,
 *  cf. `EmployeeAccountPanel`) — c'est la page elle-même qui masque le reste. */
const EMPLOYEE_ROUTES = ["/pos", "/stocks", "/settings"] as const;

function allowedRoutes(role: DeviceRole): readonly string[] {
  return role === "employee" ? EMPLOYEE_ROUTES : [];
}

/** Le propriétaire a seul la main sur l'appareil (vrai propriétaire, pas un employé). */
export function isOwner(role: DeviceRole): boolean {
  return role === "owner";
}

/** Une route est-elle autorisée pour ce rôle ? */
export function canAccessRoute(route: string, role: DeviceRole): boolean {
  if (isOwner(role)) return true;
  const allowed = allowedRoutes(role);
  return allowed.some((r) => route === r || route.startsWith(`${r}/`));
}

/** Liste de navigation à afficher pour ce rôle. `/history` n'est pas un onglet. */
export function navRoutes(role: DeviceRole): string[] {
  switch (role) {
    case "owner":
      return ["/dashboard", "/pos", "/stocks", "/reports", "/settings"];
    default:
      return ["/accueil", "/pos", "/stocks", "/settings"];
  }
}

/** Route de repli si l'écran courant est interdit (la caisse). */
export function fallbackRoute(role: DeviceRole): string {
  return canAccessRoute("/pos", role) ? "/pos" : "/pos";
}
