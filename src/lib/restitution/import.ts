import { getClosing, saveClosingImport, type ClosingImport, type SyncFields } from "@/lib/db";
import type { ClosingImportResult, ClosingPayload } from "./types";

/**
 * Importe une clôture lue depuis le QR de l'employé. Vérifie l'anti-doublon : si l'id
 * existe déjà, la clôture est déjà dans la caisse du propriétaire → `duplicate`.
 * @param ownerDevice  deviceId du PROPRIÉTAIRE courant ; doit correspondre à
 *                     `payload.ownerDevice` (sinon le QR visait une autre caisse).
 */
export async function applyClosingImport(
  payload: ClosingPayload,
  ownerDevice: string,
): Promise<ClosingImportResult> {
  if (payload.ownerDevice && payload.ownerDevice !== ownerDevice) {
    return { status: "mismatch", reason: "Ce QR n'est pas destiné à cet appareil." };
  }
  const existing = await getClosing(payload.id);
  if (existing) return { status: "duplicate", closing: existing };

  const now = Date.now();
  const closing: Omit<ClosingImport, keyof SyncFields> = {
    id: payload.id,
    shopName: payload.shop,
    employeeDeviceId: payload.employeeDevice,
    employeeName: payload.employeeName,
    ownerDeviceId: ownerDevice,
    periodFrom: payload.from,
    periodTo: payload.to,
    salesCount: payload.sales,
    itemsCount: payload.items,
    revenue: Math.round(payload.revenue),
    profit: Math.round(payload.profit),
    importedAt: now,
    byCategory: payload.byCategory,
    byProduct: payload.byProduct,
  };
  await saveClosingImport(closing);
  const saved = await getClosing(payload.id);
  if (!saved) return { status: "mismatch", reason: "La clôture n'a pas pu être enregistrée." };
  return { status: "imported", closing: saved };
}
