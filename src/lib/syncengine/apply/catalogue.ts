import type { PosDatabase } from "../../db";
import { getPreferences, savePreferences } from "../../settings";
import { enforceServiceUnlimited } from "../../db/products";
import { getIdentity } from "../identity";
import type { CatalogueSnapshotPayload, SyncOp } from "../types";
import { sameVariantStocks, touch } from "./helpers";

export async function applyCatalogueSnapshot(db: PosDatabase, op: SyncOp): Promise<void> {
  // L'instantané est le BOOTSTRAP d'un écran qui rejoint — les produits qu'il ne
  // connaît pas sont créés à la valeur ABSOLUE portée par l'op, point de départ de
  // ses deltas — mais il est aussi le SEUL canal d'une CORRECTION de stock faite par
  // le propriétaire : `updateProduct` ne propage pas le stock (une correction de
  // comptage est un choix local) et une écriture distante n'émet aucune op. Sans
  // réalignement, la caisse employé garderait le stock de son premier import pour
  // toujours, et le « transfert de stock » n'aurait lieu qu'une fois dans la vie.
  //
  // Réaligner, oui ; écraser, non. L'instantané est DATED (le `updated_at` que le
  // propriétaire a posé sur sa fiche) et n'est retenu que s'il est plus récent que ce
  // que l'appareil sait déjà : un instantané périmé, pris avant une vente que cet
  // écran a déjà comptée, ne peut donc pas ressusciter des unités vendues. Les
  // deltas restent le canal des mouvements, l'instantané celui de l'état.
  const pl = op.payload as CatalogueSnapshotPayload;
  // Partage ciblé : le propriétaire peut envoyer un sous-catalogue différent à chaque
  // employé. Tout le groupe voit les mêmes ops au relais (il est aveugle), donc c'est
  // ICI qu'on décide : un instantané qui porte un destinataire et qui n'est pas le
  // mien ne s'applique pas. Sans `target_device_id`, c'est le broadcasting historique.
  if (pl?.target_device_id && pl.target_device_id !== getIdentity().deviceId) return;
  for (const p of pl?.products ?? []) {
    if (!p?.id || p.deleted_at) continue;
    const existing = await db.products.get(p.id);
    if (!existing) {
      // Bootstrap : la fiche est celle du propriétaire, `updated_at` compris — c'est
      // cette date qui decidera, à l'import suivant, si son stock est plus frais.
      // Le CONCEPT : une prestation (type « service ») est TOUJOURS illimitée.
      await db.products.put(enforceServiceUnlimited({ ...p }));
      continue;
    }
    if (existing.deleted_at) continue;
    if (!(p.updated_at > existing.updated_at)) continue;
    // Stock illimité : l'instantané ne peut pas le porter (JSON n'a pas d'infini,
    // il y voyage en `null`) — on n'y touche donc pas.
    const stock = Number.isFinite(p.stock) ? p.stock : existing.stock;
    const variants = p.variants?.map((v) => ({ ...v }));
    if (stock === existing.stock && sameVariantStocks(variants, existing.variants)) continue;
    await db.products.put(
      enforceServiceUnlimited({
        ...existing,
        stock,
        ...(variants ? { variants } : {}),
        ...touch(),
      }),
    );
  }
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
