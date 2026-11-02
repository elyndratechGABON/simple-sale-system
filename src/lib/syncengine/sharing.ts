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

/** Les produits que le propriétaire a choisis pour CET écran.
 *
 *  Filtage DOUBLE (mission Étape 4.1) — la déduction est faite ICI une seule fois, et
 *  tout le moteur (emitShareOps, publishFreshCatalog, publishShareNow) en hérite :
 *   1. produits PRIVÉS (`is_private`, toggle du formulaire) exclus — même si la
 *      décision dit « tout le stock », un produit privé ne quitte jamais son écran ;
 *   2. produits NON SÉLECTIONNÉS (mode « sélection ») exclus — la décision du pair
 *      fait foi, l'id absent de `shared_product_ids` n'est pas envoyé.
 *
 *  Les TOMBSTONES (`deleted_at`) des produits qui restaient dans la sélection / le
 *  mode tout REPARTENT dans le payload : l'absence seule ne supprime rien chez
 *  l'employé (AGENTS.md), la suppression partagée doit donc voyager comme valeur
 *  explicite pour que sa fiche meurt chez lui aussi. */
export async function resolveSharedProducts(peer: PairedDevice): Promise<Product[]> {
  const db = getDB();
  const vivants = (await listProducts()).filter((p) => !p.is_private);
  const { mode, productIds } = shareDecisionOf(peer);
  const garder = mode === "all" ? null : new Set(productIds);
  const partis = garder ? vivants.filter((p) => garder.has(p.id)) : vivants;
  // Tombstones du périmètre du pair : produits déjà morts, jamais privés, dont la
  // suppression — une fois arrivée au relais — tue la fiche locale chez lui. Le
  // rejeu est idempotent : applyCatalogueSnapshot réécrit la tombstone telle quelle.
  const morts = (await db.products.toArray()).filter(
    (p) => p.deleted_at && !p.is_private && (garder ? garder.has(p.id) : true),
  );
  return [...partis, ...morts];
}

/** Empreinte du sous-catalogue : « ce que je lui ai déjà envoyé a-t-il changé ? ».
 * Inclut le stock global + CHAQUE stock de variante, sinon une variante déplacée
 * (total inchangé) ne déclencherait pas de réenvoi. Inclut AUSSI la mort : la
 * tombstone d'un produit part arrive à la MÊME empreinte (id:stock:prix) que le
 * produit vivant — sans le marqueur la réémission de suppression était tuée
 * par le dédoublonnage, et l'employé gardait la fiche pour toujours. */
export function signatureOf(products: Product[]): string {
  return products
    .map((p) => {
      const vars = p.variants?.map((v) => `${v.id}:${v.stock ?? "inf"}`).join(",");
      const mort = p.deleted_at ? ":del" : "";
      return `${p.id}:${Number.isFinite(p.stock) ? p.stock : "inf"}:${p.price}${mort}${vars ? `|${vars}` : ""}`;
    })
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

/** Les pairs employés réellement appairés, hors soi-même. Un écran RÉVOQUÉ
 *  (tombstone) ne reçoit plus rien : sa fiche au registre ne sert qu'à s'opposer à sa
 *  résurrection. */
export async function pairedEmployees(shopId: string): Promise<PairedDevice[]> {
  return getDB()
    .paired_devices.where("shop_id")
    .equals(shopId)
    .filter(
      (p) => p.status !== "pending" && p.status !== "revoked" && p.id !== getIdentity().deviceId,
    )
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

/**
 * Publication IMMÉDIATE pour un pair : émet son instantané (fenêtre anti-spam
 * contournée) et marque la signature comme partie. L'appelant pousse l'outbox au
 * relais aussitôt (`runOpsExchange`) — l'op reste en file tant qu'elle n'est pas
 * acquittée, donc un échec réseau n'engage rien : la donnée converge de toute façon,
 * la signature mémorisée ne dédoublonne que les réémissions inutiles.
 *
 * @returns le NOMBRE de produits partis dans l'instantané — `0` quand rien n'a été
 *  émis (catalogue résolu vide, écran introuvable). L'appelant peut ainsi distinguer
 *  « parti » d'« émis » — l'ancien booléen renvoyait `true` même sur une émission
 *  nulle : le dialogue affichait un succès sans qu'aucune op ne parte.
 */
export async function publishShareNow(peerId: string): Promise<number> {
  const db = getDB();
  const peer = await db.paired_devices.get(peerId);
  if (!peer) return 0;
  const part = await emitShareOps(peer, { force: true });
  if (!part) return 0; // rien à émettre : décision inchangée ou catalogue résolu vide
  await markSharePublished(peer.id, part.signature, part.at);
  return part.count;
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
