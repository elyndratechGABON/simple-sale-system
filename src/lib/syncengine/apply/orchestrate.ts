import { getDB } from "../../db";
import { invalidateSyncQueries } from "@/lib/syncengine/queries";
import type { SyncOp } from "../types";
import { applyOp } from "./dispatch";
import { compareOps, resolveTrustedKeys, verifyAgainst } from "./trust";

/**
 * Toutes les ops d'un seul tenant, dans l'ordre déterministe, atomiquement.
 *
 * `fromArchive` : les opérations viennent de l'ARCHIVE de l'orchestrateur (la
 * restauration d'une boutique après perte), pas du relais. La vérification des
 * signatures est alors MIS DE CÔTÉ, et c'est délibéré : l'archive est le propre
 * journal du compte, chiffré avec sa clé et servi à travers un job que seul un
 * écran du compte peut ouvrir. Le client ne SAIT pas vérifier ces opérations — les
 * clés de ses pairs ont disparu avec la fiche locale — et il ne doit pas les
 * rejeter : ses ventes et son catalogue sont là, signés, dans l'archive de son
 * commerce.
 *
 * Ce que la vérification protège reste protégé : le CANAL P2P, lui, vérifie
 * toujours. L'archive est le lieu où le serveur engage sa parole.
 */
export async function applyRemoteOps(
  ops: SyncOp[],
  options: { fromArchive?: boolean } = {},
): Promise<{ applied: number; skipped: number }> {
  if (ops.length === 0) return { applied: 0, skipped: 0 };
  const sorted = [...ops].sort(compareOps);
  const db = getDB();

  // TOUTE LA CRYPTOGRAPHIE AVANT LA TRANSACTION. La vérification est une promesse
  // WebCrypto : l'await qui la suit sortirait de la zone IndexedDB-native de Dexie et la
  // transaction se committerait sous les pieds de l'appelant (`PrematureCommitError`).
  // On résout donc les clés et les signatures ICI, hors transaction ; celle-ci ne
  // manipule plus que du JSON déjà indexé.
  //
  // Pourquoi une preuve est nécessaire : le relais est aveugle et `shop_id` vient du
  // client. Sans signature, quiconque peut écrire au relais (jeton lu dans le bundle,
  // `shop_id` énumérable) injecte des ventes, des prix, des annulations.
  let trusted: SyncOp[];
  if (options.fromArchive) {
    // L'archive engage la parole du serveur (cf. le commentaire de la fonction).
    trusted = sorted;
  } else {
    const keys = await resolveTrustedKeys(db, sorted);
    const checks = await Promise.all(sorted.map((op) => verifyAgainst(op, keys.get(op.device_id))));
    // L'ordre global est RÉTABLI : `trusted` suit `sorted`, pas l'ordre des vérifications.
    trusted = sorted.filter((_, i) => checks[i]);
  }

  const result = await db.transaction(
    "rw",
    [
      db.products,
      db.sales,
      db.sale_items,
      db.clients,
      db.charges,
      db.processed_ops,
      db.paired_devices,
      db.settings,
      db.shop_profiles,
      // Le handler `stock.adjusted` journalise le mouvement chez le récepteur
      // (`recordMovement`) — absent de cette liste, la transaction échouait NotFound.
      db.stock_movements,
    ],
    async () => {
      const seen = new Set<string>();
      const now = Date.now();
      let applied = 0;
      let skipped = sorted.length - trusted.length;
      for (const op of trusted) {
        if (seen.has(op.id) || (await db.processed_ops.get(op.id))) {
          skipped++;
          continue;
        }
        seen.add(op.id);
        await applyOp(db, op);
        await db.processed_ops.put({ id: op.id, processed_at: now });
        // Appliquer une op d'un pair, c'est l'avoir rencontré : il entre au registre
        // des appareils du compte (liste « Appareils » des Paramètres, pairing).
        if (op.type === "device.announce") {
          // `applyOp` a déjà écrit la fiche détaillée (statut, rôle, clé publique) ;
          // la surcharger ici effacerait précisément ce que l'annonce apportait.
        } else if (op.type === "device.approve") {
          // La décision du principal porte l'APPROUVÉ, pas l'approbateur : elle ne crée
          // donc aucune fiche. Elle se contente de marquer l'approbateur comme vu — s'il
          // est connu. Créer ici une fiche à son nom produisait une ligne « Écran sans
          // nom » que `RoleBadge` lisait « Propriétaire » faute de rôle : un fantôme
          // d employing device dans « Activité du personnel ».
          const dejaConnu = await db.paired_devices.get(op.device_id);
          if (dejaConnu) {
            await db.paired_devices.put({ ...dejaConnu, last_seen: now, updated_at: now });
          }
        } else if (op.type === "device.leave") {
          // Le départ EFFACE la fiche (`applyOp`) : le tampon générique ci-dessous la
          // recréerait avec `{ id, shop_id }` — un fantôme que le rôle absent ferait
          // lire « Propriétaire ». Aucun upsert forcé ici.
        } else {
          // Toute autre op prouve qu'on a RENCONTRÉ l'appareil : tampon `last_seen` sur la
          // fiche. Ne JAMAIS écraser une fiche détaillée posée par une annonce (statut,
          // rôle, clé publique) : une op ordinaire — un instantané de catalogue, une vente —
          // ne doit pas révoquer l'appairage ni le rôle déjà établis.
          const existing = (await db.paired_devices.get(op.device_id)) ?? {
            id: op.device_id,
            shop_id: op.shop_id,
          };
          await db.paired_devices.put({ ...existing, last_seen: now, updated_at: now });
        }
        applied++;
      }
      return { applied, skipped };
    },
  );

  // Une op distante MODIFIE les mêmes tables que les mutations locales : sans ce
  // rafraîchissement, l'écran continuait d'afficher l'ancienne quantité jusqu'au
  // remontage de page. C'est le symptôme « le stock ne se met pas à jour » sur un
  // téléphone qui reçoit la vente d'un autre écran du même commerce.
  //
  // `applyRemoteOps` est donc responsible de l'invalidation de ce qu'elle a écrit —
  // sinon chaque appelant doit s'en souvenir, et il y en a déjà un qui l'avait oublié
  // (les invalidations locales de pos.tsx).
  await invalidateSyncQueries();
  return result;
}
