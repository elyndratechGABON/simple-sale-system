import { emitOp } from "../ops";
import { ensureIdentity, isSharedGroup } from "../identity";
import { runOpsExchange } from "@/lib/sync";
import { getDB, purgeAllData } from "@/lib/db";
import type { DeviceLeavePayload } from "../types";
import { resetGatekeeper } from "@/lib/gatekeeper";
import { savePreferences } from "@/lib/settings";

/**
 * Démission (l'ÉCRAN employé se retire lui-même) : l'op `device.leave` est signée par
 * l'appareil partant et visée `org_device_id` = lui-même. Aucune déclaration de rôle,
 * aucun code : la seule preuve est SA signature, déjà épinglée dans le registre des
 * pairs de chaque écran — c'est ce qui fait effacer sa fiche chez tout le monde, sans
 * dépendre d'une action du propriétaire ni d'un serveur.
 *
 * Scindée en deux étapes pour survit au purge : l'op part au relais AVANT que la base
 * locale ne disparaisse. Sans cet ordre, la purge emporterait l'outbox et la démission
 * ne serait jamais poussée — le propriétaire garderait un écran fantôme à jamais.
 */

/** Émet `device.leave` et tente de le pousser tout de suite (best-effort). */
export async function emitLeaveOp(): Promise<void> {
  const identity = await ensureIdentity();
  // Sans compte partagé, personne n'a besoin d'apprendre le départ : rien à émettre.
  if (!isSharedGroup(identity.shopId)) return;
  const db = getDB();
  const payload: DeviceLeavePayload = { org_device_id: identity.deviceId };
  // `emitOp` écrit AUSSI le compteur `seq` dans `settings` (cf. ops.ts) : le store est
  // inclus ici, sinon la transaction échouait NotFound.
  await db.transaction("rw", [db.sync_ops, db.settings], async () => {
    await emitOp(db, identity, {
      type: "device.leave",
      entity_id: identity.deviceId,
      payload,
    });
  });
  // Un tour de manivelle immédiat : pousse l'outbox contenant le départ.
  await runOpsExchange();
}

/** Purge locale + retour au premier lancement (comme la suppression de boutique). */
export async function finalizeLeave(): Promise<void> {
  await purgeAllData();
  resetGatekeeper();
  savePreferences({ onboarded: false });
}

/** Le tout pour un bouton : pousser le départ, puis tout purger localement. */
export async function leaveShop(): Promise<void> {
  await emitLeaveOp();
  await finalizeLeave();
}
