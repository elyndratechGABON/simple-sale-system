// Couche d'accès aux données pour le moteur de synchronisation.
// Centralise `getDB()` en UN SEUL endroit — plus aucune déclaration `const db = getDB()`
// dispersée dans le code. Tous les modules reçoivent ce repo par injection de dépendance.

import { getDB } from "../../db";
import type { ProcessedOp, PairedDevice } from "../types";

/** Interface du repository de synchronisation — DI friendly, testable. */
export interface SyncRepository {
  // paired_devices
  getPairedDevice(deviceId: string): Promise<PairedDevice | undefined>;
  getPairedDevicesByShop(shopId: string): Promise<PairedDevice[]>;
  putSettings(key: string, value: number | string): Promise<void>;
  getSettings(key: string): Promise<{ key: string; value: number | string } | undefined>;

  // processed_ops
  getProcessedOp(opId: string): Promise<ProcessedOp | undefined>;

  // products (pour signature catalogue)
  listProducts(): Promise<
    Array<{ id: string; name: string; stock: number; price: number; category: string }>
  >;
}

/** Crée le repository concret (production). */
export function makeSyncRepository(): SyncRepository {
  const db = getDB();

  return {
    async getPairedDevice(deviceId) {
      return db.paired_devices.get(deviceId);
    },
    async getPairedDevicesByShop(shopId) {
      return db.paired_devices.where("shop_id").equals(shopId).toArray();
    },
    async putSettings(key, value) {
      await db.settings.put({ key, value });
    },
    async getSettings(key) {
      const setting = await db.settings.get(key);
      if (!setting) return undefined;
      return { key: setting.key, value: Number(setting.value) };
    },
    async getProcessedOp(opId) {
      return db.processed_ops.get(opId);
    },
    async listProducts() {
      const products = await db.products.toArray();
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        price: p.price,
        category: p.category,
      }));
    },
  };
}
