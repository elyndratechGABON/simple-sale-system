// Signature et publication du catalogue (sous-catalogue par employé).
// Le propriétaire maintient pour CHAQUE écran employé un instantané ABSOLU au relais.

import type { SyncRepository, TransportClient, SyncIdentity, PairedDevice, SyncOp } from "./types";

const KEY_LAST_CATALOG_SIG = "syncengine_last_catalog_sig";

/** Signature stable du catalogue local : les champs qui suffisent à décider
 *  « le stock (et le catalogue) des autres a-t-il changé ? » — pas la photo (binaire, locale). */
export async function catalogSignature(repo: SyncRepository): Promise<string> {
  const products = (await repo.listProducts())
    .map((p: { id: string; name: string; stock: number; price: number; category: string }) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      price: p.price,
      category: p.category,
    }))
    .sort((a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify(products);
}

/** Republie, pour CHAQUE écran employé, le sous-catalogue que le propriétaire lui a
 *  choisi — et lui seulement. Avant, un changement de catalogue repartait en un instantané
 *  que TOUT le groupe appliquait : un employé ne pouvait donc pas être privé d'un article.
 *  `emitShareOps` ne sort que si le sous-catalogue de ce pair a changé depuis son dernier
 *  envoi RÉUSSI, et la signature n'est mémorisée qu'après le push (un échec n'enferme pas
 *  le relais sur un catalogue périmé). Pousse sur-le-champ (mini-push de fin de rotation)
 *  pour que le relais la détienne dès ce cycle. */
export async function publishFreshCatalog(
  client: TransportClient,
  identity: SyncIdentity,
  repo: SyncRepository,
  emitShareOps: (
    peer: PairedDevice,
    opts?: { force?: boolean },
  ) => Promise<{ signature: string; count: number; at: number } | null>,
  markSharePublished: (peerId: string, signature: string, at: number) => Promise<void>,
  pairedEmployees: (shopId: string) => Promise<PairedDevice[]>,
  listPendingOps: (shopId: string) => Promise<SyncOp[]>,
  signAll: (ops: SyncOp[]) => Promise<SyncOp[]>,
  markOpsSynced: (opIds: string[]) => Promise<void>,
): Promise<void> {
  if (identity.role === "employee") return;

  const sig = await catalogSignature(repo);
  // Catalogue vide → rien à redistribuer, et aucune trace : un republier avec zéro produit
  // n'apporterait que du bruit au relais (et ferait « voir » un appareil sans catalogue).
  if (!sig || sig === "[]") return;

  const lastSig = await repo.getSettings(KEY_LAST_CATALOG_SIG);
  // Catalogue inchangé : inutile de calculer une part par employé.
  if (lastSig && typeof lastSig.value === "string" && lastSig.value === sig) return;

  // Une seule passe : on prépare les parts à envoyer, puis on ne pousse que si au moins
  // un écran a effectivement changé de sous-catalogue. Le délai anti-spam est celui du
  // PAIR (`shared_published_at`) : un délai global bloquerait la publication même quand la
  // part d'UN employé vient de changer — précisément le cas qu'on veut voir passer.
  const peers = await pairedEmployees(identity.shopId);
  const parts: { peerId: string; signature: string; at: number }[] = [];

  for (const peer of peers) {
    const part = await emitShareOps(peer);
    if (part) parts.push({ peerId: peer.id, signature: part.signature, at: part.at });
  }
  if (parts.length === 0) return;

  const pending = await listPendingOps(identity.shopId);
  if (pending.length > 0) {
    const signed = await signAll(pending);
    if (await client.push(identity.shopId, signed)) {
      await markOpsSynced(pending.map((o) => o.id));
      await repo.putSettings(KEY_LAST_CATALOG_SIG, sig);
      for (const part of parts) await markSharePublished(part.peerId, part.signature, part.at);
    }
  }
}
