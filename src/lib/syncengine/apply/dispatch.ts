import type { PosDatabase } from "../../db";
import type { SyncOp } from "../types";
import { applyCatalogueSnapshot } from "./catalogue";
import { applyChargeDeleted, applyChargeSaved } from "./charges";
import { applyClientCreated, applyClientDeleted, applyClientUpdated } from "./clients";
import { applyDeviceAnnounce, applyDeviceApprove } from "./devices";
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
