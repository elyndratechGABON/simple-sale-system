import type { PosDatabase } from "../../db";
import { getPreferences, savePreferences } from "../../settings";
import { enforceServiceUnlimited } from "../../db/products";
import { getIdentity } from "../identity";
import type { CatalogueAckPayload, CatalogueSnapshotPayload, SyncOp } from "../types";
import { touch } from "./helpers";

export async function applyCatalogueSnapshot(db: PosDatabase, op: SyncOp): Promise<void> {
  // L'instantané est le BOOTSTRAP d'un écran qui rejoint — les produits qu'il ne
  // connaît pas sont créés à la valeur ABSOLUE portée par l'op, point de départ de
  // ses deltas — mais il est aussi le SEUL canal d'une CORRECTION de stock faite par
  // le propriétaire : `updateProduct` ne propage pas le stock (une correction de
  // comptage est un choix local) et une écriture distante n'émet aucune op. Sans
  // réalignement, la caisse employé garderait le stock de son premier import pour
  // toujours, et le « transfert de stock » n'aurait lieu qu'une fois dans la vie.
  //
  // Le snapshot est la SOURCE DE VÉRITÉ ABSOLUE : un `bulkPut` écrase et insère le
  // catalogue porté par l'op sans comparaison d'`updated_at` — un piège pour la
  // synchro initiale (un produit créé à la même date, ou plus récent par erreur de
  // fuseau, était silencieusement ignoré). Les ventes ne sont PAS concernées : l'op
  // ne cible que `products` (cf. apply.ts dispatch — la vente arrive par sale.*).
  //
  // ABSENCE ≠ SUPPRESSION (cf. AGENTS.md) : un produit local absent du snapshot
  // n'est jamais supprimé — le partage n'ajoute et n'actualise que. Un produit
  // retiré explicitement par le propriétaire voyage DANS le payload avec son
  // `deleted_at` : le bulkPut ci-dessous écrit cette pierre tombale telle quelle.
  const pl = op.payload as CatalogueSnapshotPayload;
  // Partage ciblé : le propriétaire peut envoyer un sous-catalogue différent à chaque
  // employé. Tout le groupe voit les mêmes ops au relais (il est aveugle), donc c'est
  // ICI qu'on décide : un instantané qui porte un destinataire et qui n'est pas le
  // mien ne s'applique pas. Sans `target_device_id`, c'est le broadcasting historique.
  if (pl?.target_device_id && pl.target_device_id !== getIdentity().deviceId) return;

  const productsToImport = pl?.products?.filter((p) => p?.id) ?? [];
  await db.products.bulkPut(productsToImport.map((p) => enforceServiceUnlimited({ ...p })));
  // Le relais est aussi le garant du NOM de la boutique : si ce nouvel écran est
  // encore sur le placeholder « Ma boutique » (fiche jamais écrite à l'onboarding,
  // ou QR généré AVANT cette correction), le nom transmis par le membre principal
  // le remplace. Un nom déjà posé localement n'est PAS écrasé.
  if (pl?.shop?.storeName) {
    const profile = await db.shop_profiles.get("me");
    const prefs = getPreferences();
    const unset = (v?: string) => !v?.trim() || v.trim() === "Ma boutique";
    if (unset(prefs.workspaceName) && profile && unset(profile.storeName)) {
      savePreferences({ workspaceName: pl.shop.storeName });
      await db.shop_profiles.put({
        ...profile,
        storeName: pl.shop.storeName,
        ...touch(),
      });
    }
  }
}

/**
 * ACK de l'EMPLOYÉ (mission badge — Étape 4) : il a APPLIQUÉ l'instantané portant
 * `batch_id`. Chez le PATRON, l'op snapshot de sa propre outbox qui porte ce batch_id
 * est PURGÉE — le badge de l'employé passe d'« En cours » (orange) à « À jour » (vert)
 * au prochain invalidation de `["share_pending"]` (faite par `invalidateSyncQueries`).
 *
 * Recherche : les ops `catalogue.snapshot` PENDING de l'outbox, peu nombreuses depuis
 * la purge d'urgence et le push par lots — un filtre mémoire suffit, pas d'index.
 * Idempotent : un rejeu d'ACK ne trouve plus rien, ne supprime rien d'autre.
 */
export async function applyCatalogueAck(db: PosDatabase, op: SyncOp): Promise<void> {
  const batchId = (op.payload as CatalogueAckPayload | undefined)?.batch_id;
  if (!batchId) return;
  const pendantes = await db.sync_ops.where("status").equals("pending").toArray();
  const acquittees = pendantes.filter(
    (o) =>
      o.type === "catalogue.snapshot" &&
      (o.payload as CatalogueSnapshotPayload | undefined)?.batch_id === batchId,
  );
  if (acquittees.length === 0) return;
  await db.sync_ops.bulkDelete(acquittees.map((o) => o.id));
}
