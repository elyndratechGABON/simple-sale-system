// Registre des appareils du même compte déjà rencontrés (`paired_devices`).
//
// Alimenté par `apply.ts` : appliquer les ops d'un pair, c'est l'avoir vu. Le registre
// nourrira la liste « Appareils » des Paramètres, le pairing chiffré et la gestion des
// rôles — le transport n'en dépend pas encore.
import { getDB } from "../db";
import { getIdentity } from "./identity";
import type { PairedDevice } from "./types";

/** L'identité courante, ou `null` si elle n'est pas encore chargée — ce module est aussi
 *  lu depuis des contextes où l'identité peut manquer ; on ne veut pas planter un écran
 *  pour un filtre d'affichage. */
function currentDeviceId(): string | null {
  try {
    return getIdentity().deviceId;
  } catch {
    return null;
  }
}

/**
 * Les appareils du groupe connus localement, du plus récent au plus ancien.
 *
 * MOI-MÊME n'en fait PAS partie : un appareil n'est pas son propre pair. Le registre peut
 * contenir sa propre ligne — une approbation ou une op ancienne l'y a mise — et l'afficher
 * dans « Activité du personnel » produisait une ligne « Écran sans nom » que le rôle
 * absent faisait lire « Propriétaire ».
 */
export async function listPairedDevices(shopId: string): Promise<PairedDevice[]> {
  const device = await getDB().paired_devices.where("shop_id").equals(shopId).sortBy("updated_at");
  const moi = currentDeviceId();
  const pairs = device.reverse();
  return moi ? pairs.filter((p) => p.id !== moi) : pairs;
}

/**
 * Rafraîchit tout ce qui dépend du REGISTRE D'APPAREILS.
 *
 * Le nombre d'écrans et le rôle affiché sont lus par trois requêtes distinctes, dans
 * trois écrans différents, et aucune ne déduit son invalidation des autres. Résultat
 * constaté : approuver un employé ne changeait le compteur qu'au handshake suivant — donc
 * pas du tout hors ligne, où le compteur restait figé indéfiniment.
 *
 * Centraliser la liste ici évite d'avoir à se souvenir de la liste complète à chaque
 * mutation : ajouter une lecture du registre plus tard ne pourra pas être oubliée ici,
 * seulement ajouter une entrée à ce tableau.
 */
export const DEVICE_DEPENDENT_QUERIES = [
  "paired_devices",
  "sync_identity",
  "account_quota",
  "products",
  "sales",
] as const;

/** Invalide les lectures dépendantes du registre. Best-effort : un écran non monté
 *  n'a rien à rafraîchir, React Query ignore simplement la clé absente. */
export async function invalidateDeviceQueries(
  qc: Pick<import("@tanstack/react-query").QueryClient, "invalidateQueries">,
): Promise<void> {
  await Promise.all(
    DEVICE_DEPENDENT_QUERIES.map((key) => qc.invalidateQueries({ queryKey: [key] })),
  );
}
