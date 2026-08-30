// Registre des appareils du même compte déjà rencontrés (`paired_devices`).
//
// Alimenté par `apply.ts` : appliquer les ops d'un pair, c'est l'avoir vu. Le registre
// nourrira la liste « Appareils » des Paramètres, le pairing chiffré et la gestion des
// rôles — le transport n'en dépend pas encore.
import { getDB } from "../db";
import type { PairedDevice } from "./types";

/** Les appareils du groupe connus localement, du plus récent au plus ancien. */
export async function listPairedDevices(shopId: string): Promise<PairedDevice[]> {
  const device = await getDB().paired_devices.where("shop_id").equals(shopId).sortBy("updated_at");
  return device.reverse();
}
