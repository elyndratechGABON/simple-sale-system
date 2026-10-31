import type { PosDatabase } from "../../db";
import { verifyOpSignature } from "../identity";
import { knownPairCode } from "../pairing/code";
import type { DeviceAnnouncePayload, PairedDevice, SyncOp } from "../types";

/**
 * Clés publiques autorisées à signer, résolues AVANT toute vérification.
 *
 * Deux sources, et la seconde est ce qui rend la chaîne non circulaire :
 *
 *  1. Les fiches pairées déjà connues — la clé y a été posée par une annonce acceptée.
 *  2. Les annonces du lot EN COURS, mais seulement si elles sont PROUVÉES : le code de
 *     paire correspond, ou l'appareil est déjà au registre, ou le groupe est encore vide
 *     (premier contact : il n'y a rien à protéger, c'est le cas du premier écran d'un
 *     commerce — et c'est pour cela que le `seq` de l'annonce, forcément postérieur aux
 *     ventes qu'elle accompagne, peut encore servir).
 *
 * Le `seq` de l'annonce la plaçant APRÈS les ventes du même émetteur au tri global, la
 * clé doit être connue AVANT que ces ventes soient vérifiées — d'où la résolution
 * préalable, et non une clé qui n'apparaîtrait qu'en cours de route.
 *
 * Conséquence, et c'est le but : un attaquant qui écrit librement au relais ne peut pas
 * s'attribuer une identité. Il peut annoncer un `device_id` inventé, mais dans un groupe
 * déjà peuplé et sans le code de paire, son annonce n'entre pas dans cette table, sa clé
 * n'est donc reference nulle part, et toutes les ops qu'il signerait ensuite sont
 * refusées. Il peut annoncer sous le `device_id` d'un vrai appareil, mais il ne détient
 * pas sa clé privée.
 */
export async function resolveTrustedKeys(
  db: PosDatabase,
  ops: SyncOp[],
): Promise<Map<string, string>> {
  const keys = new Map<string, string>();
  for (const op of ops) {
    if (op.type !== "device.announce") continue;
    const pl = op.payload as DeviceAnnouncePayload;
    if (!pl?.public_key) continue;
    const existing = await db.paired_devices.get(pl.device_id ?? op.device_id);
    const proved = await isAnnounceProven(db, pl, op, existing);
    if (proved) keys.set(pl.device_id ?? op.device_id, pl.public_key);
  }
  for (const peer of await db.paired_devices.toArray()) {
    // Tombstone : un écran révoqué n'autorise plus AUCUNE op — sa clé reste connue
    // (pour distinguer l'usurpation de l'écran légitime) mais ne compte plus comme
    // signataire autorisé : ses blooms suivants sont refusés.
    if (peer.public_key && peer.status !== "revoked" && !keys.has(peer.id))
      keys.set(peer.id, peer.public_key);
  }
  return keys;
}

/** L'annonce apporte-t-elle une preuve qu'on ne peut pas fabriquer ? */
async function isAnnounceProven(
  db: PosDatabase,
  pl: DeviceAnnouncePayload,
  op: SyncOp,
  existing: PairedDevice | undefined,
): Promise<boolean> {
  if (existing?.status === "paired") return true; // déjà au registre : rien à prouver
  // Le code de paire : preuve que le principal a ouvert son QR pour CET écran. La
  // fenêtre de preuve (12 h) survit au sommeil du téléphone du patron — sans elle,
  // un employé scanné le matin était ignoré le soir.
  if (await knownPairCode(pl.pair_code)) return true;
  // Groupe vide : premier écran du commerce. Rien à protéger — c'est la confiance
  // initiale, celle qui existait avant les signatures.
  // (Une opération sans groupe — venue d'une archive ancienne — ne peut être prouvée
  // par ce chemin : elle ne l'est par aucun autre non plus.)
  if (!op.shop_id) return false;
  return (await db.paired_devices.where("shop_id").equals(op.shop_id).count()) === 0;
}

/**
 * L'op est-elle authentique ? Une op sans signature est TOUJOURS refusée : tolérer
 * l'absence laisserait exactement la faille qu'on ferme (l'attaquant omet le champ).
 * C'est le coût du déploiement — une caisse pas encore mise à jour est ignorée au lieu
 * d'appliquer ses ops, ses ventes convergeront au rollout suivant.
 */
export async function verifyAgainst(op: SyncOp, publicKey: string | undefined): Promise<boolean> {
  if (!op.sig) return false;
  if (!publicKey) return false;
  return verifyOpSignature(op, publicKey);
}

export function compareOps(a: SyncOp, b: SyncOp): number {
  if (a.created_at !== b.created_at) return a.created_at - b.created_at;
  if (a.device_id !== b.device_id) return a.device_id < b.device_id ? -1 : 1;
  return a.seq - b.seq;
}
