// Environnement de test du moteur de synchronisation (uniquement node).
//
//  - `fake-indexeddb/auto` installe un IndexedDB en mémoire dans le contexte global ;
//  - `getDB()` exige un `window`, fourni ici en lui donnant le contexte node ;
//  - `resetDBForTests` + `resetIdentityForTests` isolent chaque scénario : la base est
//    supprimée, l'identité oubliée → chaque test repart d'un appareil neuf.
import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { getDB, resetDBForTests } from "../../db";
import { ensureIdentity, getDeviceKeys, isSharedGroup, resetIdentityForTests } from "../identity";
import { applyRemoteOps } from "../apply";
import { emitOp, signAll } from "../ops";
import { listPendingOps } from "../outbox";
import type { SyncOp } from "../types";

if (!("window" in globalThis)) {
  (globalThis as Record<string, unknown>).window = globalThis;
}

/**
 * Les ops en attente de l'APPAREIL COURANT, SIGNÉES par sa clé — c'est-à-dire ce que
 * `exchangeOps` pousserait réellement au relais.
 *
 * À appeler chez l'émetteur, jamais chez le récepteur : la signature engage la clé
 * privée du device qui émet, or les tests simulent deux appareils dans un même process.
 * Capturer ici, réappliquer chez l'autre, reproduit le vrai trajet.
 *
 * L'ANNONCE du groupe est ajoutée si elle manque. En production elle vient de
 * `announceDevice()` au onboarding, et elle est ce qui donne au récepteur la clé de
 * l'émetteur : sans elle, le récepteur n'a rien contre quoi vérifier et rejetterait
 * jusqu'à la première vente. Les tests qui construisent deux appareils à la main
 * doivent donc la faire émettre — c'est le trajet réel, pas un raccourci de test.
 */
export async function captureSigned(): Promise<SyncOp[]> {
  const identity = await ensureIdentity();
  const db = getDB();
  const known = await db.paired_devices.get(identity.deviceId);
  if (isSharedGroup(identity.shopId) && !known?.public_key) {
    await db.transaction("rw", [db.sync_ops, db.settings], async () => {
      await emitOp(db, identity, {
        type: "device.announce",
        entity_id: identity.deviceId,
        payload: {
          device_id: identity.deviceId,
          public_key: getDeviceKeys().publicKey,
          employee_name: identity.employeeName,
          role: identity.role,
        },
      });
    });
  }
  return signAll(await listPendingOps(identity.shopId));
}

/** Capture signée chez l'émetteur, application chez le récepteur — sans re-signer. */
export async function applyRemoteOpsSigned(ops: SyncOp[]): Promise<{
  applied: number;
  skipped: number;
}> {
  return applyRemoteOps(ops);
}

/**
 * L'annonce d'un pair, comme le relais la verrait : signée, `public_key` en chaîne,
 * `device_id` = celui du pair. C'est elle qui installe la clé d'un appareil dans le
 * registre local — sans elle, ses autres ops n'ont rien contre quoi se vérifier.
 *
 * Signée par la clé de l'appareil COURANT : le pair est simulé dans le même process,
 * et c'est la seule clé privée disponible.
 */
export async function announceOpFor(peerId: string): Promise<SyncOp> {
  const identity = await ensureIdentity();
  const [signed] = await signAll([
    {
      id: `annonce:${peerId}:1`,
      shop_id: identity.shopId,
      device_id: peerId,
      seq: 1,
      type: "device.announce",
      entity_id: peerId,
      payload: {
        device_id: peerId,
        public_key: getDeviceKeys().publicKey,
        employee_name: "Un pair",
        role: "owner",
      },
      created_at: Date.now(),
      status: "pending",
    } as SyncOp,
  ]);
  return signed;
}

afterEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
});
