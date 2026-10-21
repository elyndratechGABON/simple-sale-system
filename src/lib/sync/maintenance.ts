import { getSetting } from "@/lib/db";
import { SETTING_MAINTENANCE, type MaintenanceState } from "@/lib/gatekeeper/settings";

/**
 * Le mode maintenance est-il actif sur CET écran ?
 *
 * L'orchestrateur l'annonce à chaque handshake (toutes les minutes) ; l'écran le
 * retient. Une caisse hors ligne garde la dernière connue — c'est voulu : en
 * maintenance, la caisse doit SAVOIR qu'elle est en maintenance même si le réseau
 * est coupé.
 */
export async function getMaintenanceState(): Promise<MaintenanceState> {
  const value = await getSetting<MaintenanceState>(SETTING_MAINTENANCE);
  return {
    enabled: Boolean(value?.enabled),
    message: typeof value?.message === "string" ? value.message : "",
  };
}

export async function isMaintenanceOn(): Promise<boolean> {
  return (await getMaintenanceState()).enabled;
}
