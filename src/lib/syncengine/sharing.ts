// Partage du stock, PAR EMPLOYÉ.
//
// Le modèle d'avant est un broadcasting : le propriétaire empile un instantané ABSOLU de
// son catalogue, et quiconque est dans le groupe l'applique. Deux employés ne peuvent donc
// pas avoir moins l'un que l'autre, et « partager mon stock » n'a aucun gradient.
//
// Ici le propriétaire choisit, écran par écran : tout le catalogue, ou une sélection de
// produits. La décision vit sur l'écran du PROPRIÉTAIRE (`paired_devices`) et se résout au
// moment de publier ; l'instantané porte `target_device_id`, et un écran qui reçoit un
// instantané qui ne lui est pas destiné l'ignore (cf. `apply.ts`).
//
// ⚠️ Ce que le partage ne fait PAS : retirer un produit ne le supprime pas de la caisse de
// l'employé. Un instantané crée et met à jour, il ne supprime rien — et faire disparaître
// un article chez un tiers mérite son propre dialogue, pas un effet de bord d'une liste.
import { getDB, getShopProfile, listProducts, type Product } from "../db";
import { getPreferences } from "../settings";
import { emitOp } from "./ops";
import { ensureIdentity, getIdentity } from "./identity";
import type { CatalogueSnapshotPayload, PairedDevice, ShareMode } from "./types";

/** Fenêtre minimale entre deux publications pour le MÊME écran. */
const REPUBLISH_MIN_INTERVAL_MS = 20_000;

/** Décision effective d'un pair : jamais de décision = tout le catalogue (d'avant). */
export function shareDecisionOf(peer: PairedDevice): { mode: ShareMode; productIds: string[] } {
  return peer.share_mode === "selection"
    ? { mode: "selection", productIds: peer.shared_product_ids ?? [] }
    : { mode: "all", productIds: [] };
}

/** Les produits que le propriétaire a choisis pour CET écran. */
export async function resolveSharedProducts(peer: PairedDevice): Promise<Product[]> {
  const all = await listProducts();
  const { mode, productIds } = shareDecisionOf(peer);
  if (mode === "all") return all;
  // Les ids disparus du catalogue sont ignorés sans bruit : une sélection périmée ne doit
  // pas faire échouer le partage, elle en retire simplement l'article.
  const garder = new Set(productIds);
  return all.filter((p) => garder.has(p.id));
}

/** Empreinte du sous-catalogue : « ce que je lui ai déjà envoyé a-t-il changé ? ». */
export function signatureOf(products: Product[]): string {
  return products
    .map((p) => `${p.id}:${Number.isFinite(p.stock) ? p.stock : "inf"}:${p.price}`)
    .sort()
    .join("|");
}

/** Le meilleur nom de boutique disponible (miroir de `transport.snapshotShopName`). */
async function shopNameForSnapshot(): Promise<string | undefined> {
  const profile = await getShopProfile();
  const prefs = getPreferences();
  for (const name of [prefs.workspaceName, profile?.storeName]) {
    const trimmed = name?.trim();
    if (trimmed && trimmed !== "Ma boutique") return trimmed;
  }
  return undefined;
}

/** Les pairs employés réellement appairés, hors soi-même. */
export async function pairedEmployees(shopId: string): Promise<PairedDevice[]> {
  return getDB().paired_devices
    .where("shop_id")
    .equals(shopId)
    .filter((p) => p.status !== "pending" && p.id !== getIdentity().deviceId)
    .toArray();
}

/**
 * Émet l'instantané du sous-catalogue d'un pair dans la file d'attente, si ce qu'il doit
 * recevoir a changé depuis le dernier envoi RÉUSSI.
 *
 * La signature n'est PAS mémorisée ici : elle l'est par le transport après un `push`
 * réussi (`markSharePublished`). Mémoriser avant l'envoi enfermerait le relais sur un
 * catalogue périmé — et l'employé ne recevrait plus jamais rien.
 *
 * @returns la signature à mémoriser après push, ou `null` si rien n'a été émis.
 */
export async function emitShareOps(
  peer: PairedDevice,
  opts: { force?: boolean } = {},
): Promise<{ signature: string; count: number; at: number } | null> {
  const identity = await ensureIdentity();
  if (identity.role === "employee") return null;

  const products = await resolveSharedProducts(peer);
  // Catalogue vide → rien à partager. Pousser une sélection vide ne ferait qu'effacer le
  // bootstrap attendu chez l'employé sans rien lui apprendre.
  if (products.length === 0) return null;

  const signature = signatureOf(products);
  if (!opts.force && peer.shared_signature === signature) return null;
  const now = Date.now();
  if (!opts.force && now - (peer.shared_published_at ?? 0) < REPUBLISH_MIN_INTERVAL_MS) return null;

  const shopName = await shopNameForSnapshot();
  const payload: CatalogueSnapshotPayload = {
    products,
    target_device_id: peer.id,
    ...(shopName ? { shop: { storeName: shopName } } : {}),
  };
  const db = getDB();
  // `settings` avec `sync_ops` : `emitOp` y lit et écrit le compteur de séquence, et une
  // transaction qui n'ouvre pas ce store échoue dessus.
  await db.transaction("rw", db.sync_ops, db.settings, async () => {
    await emitOp(db, identity, { type: "catalogue.snapshot", entity_id: "catalog", payload });
  });
  return { signature, count: products.length, at: now };
}

/** Mémorise l'empreinte ET l'instant de la publication réellement partie vers ce pair
 *  (cf. `emitShareOps` — rien n'est mémorisé avant un push réussi). */
export async function markSharePublished(
  peerId: string,
  signature: string,
  at: number,
): Promise<void> {
  await getDB().paired_devices.update(peerId, {
    shared_signature: signature,
    shared_published_at: at,
  } as Partial<PairedDevice>);
}

/** Enregistre la décision du propriétaire. Ne publie PAS : le transport s'en charge dans
 *  le cycle courant, ce qui évite deux allers-retours quand la décision vient de
 *  l'écran qui parle au relais. */
export async function saveShareDecision(
  peerId: string,
  mode: ShareMode,
  productIds: string[],
): Promise<{ ok: boolean; peer?: PairedDevice }> {
  const db = getDB();
  const peer = await db.paired_devices.get(peerId);
  if (!peer) return { ok: false };
  const choix = mode === "selection" ? [...new Set(productIds)] : [];
  await db.paired_devices.update(peerId, {
    share_mode: mode,
    shared_product_ids: choix,
    // La signature décrivait ce qui était parti, plus ce qui doit partir : invalide.
    shared_signature: undefined,
    updated_at: Date.now(),
  } as Partial<PairedDevice>);
  return { ok: true, peer: await db.paired_devices.get(peerId) };
}

/** Résumé lisible de ce qui est partagé avec un écran — pour les libellés de l'UI. */
export function shareLabel(peer: PairedDevice, totalProducts: number): string {
  const { mode, productIds } = shareDecisionOf(peer);
  if (mode === "all") return `Tout le stock (${totalProducts} produits)`;
  return productIds.length === 1
    ? "1 produit sélectionné"
    : `${productIds.length} produits sélectionnés`;
}
