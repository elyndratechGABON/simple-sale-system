import { emitOp } from "../ops";
import { ensureIdentity, isSharedGroup } from "../identity";
import { runOpsExchange } from "@/lib/sync";
import { closeEmployeeHistory, getDB, getShopProfile, listProducts, purgeAllData } from "@/lib/db";
import type { DeviceLeavePayload } from "../types";
import { resetGatekeeper } from "@/lib/gatekeeper";
import { releaseSeat } from "@/lib/gatekeeper/seat";
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

/** Le propriétaire du groupe : la fiche au rôle `owner` hors soi-même. */
async function ownerPeerId(shopId: string): Promise<string | null> {
  const owners = await getDB()
    .paired_devices.where("shop_id")
    .equals(shopId)
    .filter((p) => p.role === "owner")
    .toArray();
  // Un seul propriétaire en pratique : le premier trouvé fait foi.
  return owners[0]?.id ?? null;
}

/**
 * Restitue le stock restant : une op `stock.adjusted` POSITIVE ciblée au propriétaire
 * par produit encore étalisé (les services n'ont rien à rendre). Émises AVANT le
 * `device.leave` — c'est le même tour de manivelle (`runOpsExchange`) qui pousse le
 * paquet ; après la purge, l'outbox n'existerait plus.
 */
async function emitStockReturnOps(): Promise<void> {
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) return;
  const ownerId = await ownerPeerId(identity.shopId);
  if (!ownerId) return;
  const remaining = (await listProducts()).filter(
    (p) => p.type !== "service" && Number.isFinite(p.stock) && (p.stock ?? 0) > 0,
  );
  if (remaining.length === 0) return;
  const db = getDB();
  await db.transaction("rw", [db.sync_ops, db.settings], async () => {
    for (const p of remaining) {
      await emitOp(db, identity, {
        type: "stock.adjusted",
        entity_id: p.id,
        payload: { product_id: p.id, delta: p.stock, target_device_id: ownerId },
      });
    }
  });
}

/** Émet `device.leave` et tente de le pousser tout de suite (best-effort). */
export async function emitLeaveOp(): Promise<void> {
  const identity = await ensureIdentity();
  // Sans compte partagé, personne n'a besoin d'apprendre le départ : rien à émettre.
  if (!isSharedGroup(identity.shopId)) return;
  const db = getDB();
  const profile = await getShopProfile();
  const payload: DeviceLeavePayload = {
    org_device_id: identity.deviceId,
    // L'identifiant de l'écran CHEZ LE SERVEUR : c'est lui qui permet au propriétaire
    // de rendre la place (cf. `releaseSeat`). Sans lui, le départ ne libère rien et le
    // quota compte l'écran à vie.
    ...(profile?.deviceId ? { server_device_id: profile.deviceId } : {}),
  };
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
  const identity = await ensureIdentity();
  // Le carnet d'expérience survit à la purge (hors des stores de snapshot.ts) : il n'a
  // de sens fermé QUE par la démission — une clôture par purge écraserait la durée.
  await closeEmployeeHistory(identity.shopId);
  await purgeAllData();
  resetGatekeeper();
  savePreferences({ onboarded: false });
}

/** Le tout pour un bouton : restituer le stock, pousser le départ, rendre la place, tout purger. */
export async function leaveShop(): Promise<void> {
  await emitStockReturnOps();
  await emitLeaveOp();
  // La PLACE est rendue à l'orchestrateur AVANT la purge : après, la fiche locale
  // (identifiant, enseigne, identifiants du compte) a disparu et la preuve de soi
  // avec. Best-effort : si le réseau manque, le propriétaire rendra la place en
  // recevant l'op de départ.
  const profile = await getShopProfile();
  if (profile?.deviceId) await releaseSeat(profile.deviceId);
  await finalizeLeave();
}
