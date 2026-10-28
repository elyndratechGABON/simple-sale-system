import type { PosDatabase } from "../../db";
import type { SyncOp } from "../types";
import { applyCatalogueSnapshot } from "./catalogue";
import { applyChargeDeleted, applyChargeSaved } from "./charges";
import { applyClientCreated, applyClientDeleted, applyClientUpdated } from "./clients";
import { applyDeviceAnnounce, applyDeviceApprove, applyDeviceLeave } from "./devices";
import {
  applyProductCreated,
  applyProductDeleted,
  applyProductUpdated,
  applyStockAdjusted,
} from "./products";
import { applySaleCancelled, applySaleCreated } from "./sales";

export async function applyOp(db: PosDatabase, op: SyncOp): Promise<void> {
  switch (op.type) {
    case "product.created":
      await applyProductCreated(db, op);
      break;
    case "product.updated":
      await applyProductUpdated(db, op);
      break;
    case "product.deleted":
      await applyProductDeleted(db, op);
      break;
    case "stock.adjusted":
      await applyStockAdjusted(db, op);
      break;
    case "stock.low":
      // Alerte stock bas reçue d'un employé : on l'ajoute à la liste des alertes du propriétaire.
      // L'op porte product_id, device_id (l'employé), stock actuel et seuil franchi.
      // On crée une alerte warning que l'on stocke pour l'affichage dans la cloche.
      {
        const pl = op.payload as {
          product_id: string;
          device_id: string;
          stock: number;
          threshold: number;
        };
        if (pl?.product_id && pl?.device_id && pl?.stock != null && pl?.threshold != null) {
          const alertId = `low-stock:${pl.product_id}:${pl.device_id}`;
          // Vérifier si cette alerte existe déjà (déduplication par id).
          const existing = await db.processed_ops.get(alertId);
          if (!existing) {
            await db.processed_ops.put({ id: alertId, processed_at: Date.now() });
            // On stocke l'alerte en base pour que NotificationBell puisse la lire.
            await db.transaction("rw", db.sync_lost_stock_alerts, async () => {
              await db.sync_lost_stock_alerts.add({
                id: alertId,
                product_id: pl.product_id,
                device_id: pl.device_id,
                stock: pl.stock,
                threshold: pl.threshold,
                severity: "warning",
                title: "Stock bas détecté",
                detail: `Stock à ${pl.stock} (seuil ${pl.threshold}) sur un produit employé`,
                to: "/stocks",
                created_at: Date.now(),
              });
            });
          }
        }
      }
      break;
    case "stock.conflict":
      // Survente concurrente reçue d'un pair : la vente est déjà comptée chez
      // l'émetteur, le stock se retrouve sous zéro. La vente est JAMAIS annulée —
      // le gérant est alerté, la remise au chiffre se fera au réassort/inventaire.
      {
        const pl = op.payload as {
          product_id: string;
          device_id: string;
          stock: number;
          quantity: number;
          scope: "product" | "variant";
        };
        if (pl?.product_id && pl?.device_id && pl?.stock != null) {
          const alertId = `stock-conflict:${pl.product_id}:${pl.device_id}`;
          // Dédup : un conflit par produit×écran tant que le stock reste négatif.
          const existingAlert = await db.sync_lost_stock_alerts.get(alertId);
          if (!existingAlert || existingAlert.stock >= 0) {
            const name = (await db.products.get(pl.product_id))?.name ?? "Produit";
            await db.transaction("rw", db.sync_lost_stock_alerts, async () => {
              await db.sync_lost_stock_alerts.put({
                id: alertId,
                product_id: pl.product_id,
                device_id: pl.device_id,
                stock: pl.stock,
                threshold: 0,
                severity: "warning",
                title: "Conflit de stock",
                detail: `Survente sur ${name} : le stock passe à ${pl.stock} (${pl.quantity ?? "?"} unité(s) au-delà du disponible)`,
                to: "/stocks",
                created_at: Date.now(),
              });
            });
          }
        }
      }
      break;
    case "sale.created":
      await applySaleCreated(db, op);
      break;
    case "sale.cancelled":
      await applySaleCancelled(db, op);
      break;
    case "client.created":
      await applyClientCreated(db, op);
      break;
    case "client.updated":
      await applyClientUpdated(db, op);
      break;
    case "client.deleted":
      await applyClientDeleted(db, op);
      break;
    case "charge.saved":
      await applyChargeSaved(db, op);
      break;
    case "charge.deleted":
      await applyChargeDeleted(db, op);
      break;
    case "device.announce":
      await applyDeviceAnnounce(db, op);
      break;
    case "device.approve":
      await applyDeviceApprove(db, op);
      break;
    case "device.leave":
      await applyDeviceLeave(db, op);
      break;
    case "catalogue.snapshot":
      await applyCatalogueSnapshot(db, op);
      break;
    case "category.created":
      // Les catégories personnalisées vivent dans les préférences (localStorage, par
      // appareil). Convergence différée à un futur store partagé : l'op est côtée
      // acquittée, l'émetteur ne renverra pas la même création indéfiniment.
      break;
  }
}
