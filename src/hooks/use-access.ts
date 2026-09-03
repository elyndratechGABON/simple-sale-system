// Accès de l'écran courant selon le rôle de l'appareil. Lit l'identité sync (rôle)
// via React Query et expose les routes autorisées à partir de la seule source
// (src/lib/access.ts). Tant que l'identité n'est pas chargée, on suppose `owner` :
// ne jamais restreindre par erreur au démarrage — la garde de route ne s'applique
// que dans l'appelle d'écran, jamais dans la coquille.
import { useQuery } from "@tanstack/react-query";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { canAccessRoute, fallbackRoute, isOwner, navRoutes } from "@/lib/access";

export interface AccessInfo {
  role: "owner" | "manager" | "employee";
  nav: string[];
  isOwner: boolean;
  canAccess: (route: string) => boolean;
  fallback: string;
}

export function useAccess(): AccessInfo {
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    staleTime: 60_000,
  });
  const role = identity?.role ?? "owner";
  return {
    role,
    nav: navRoutes(role),
    isOwner: isOwner(role),
    canAccess: (route) => canAccessRoute(route, role),
    fallback: fallbackRoute(role),
  };
}

export { isOwner };
