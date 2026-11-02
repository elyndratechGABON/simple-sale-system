import { getDB, listProducts } from "../../db";
import { getPreferences } from "../../settings";
import { emitOp, signAll } from "../ops";
import { listPendingOps, markOpsSynced } from "../outbox";
import { emitShareOps, markSharePublished, pairedEmployees } from "../sharing";
import type { CatalogueRequestPayload, SyncIdentity } from "../types";
import { KEY_LAST_CATALOG_SIG, type TransportClient } from "./types";

/** Signature stable du catalogue local : les champs qui suffisent à décider « le stock
 *  (et le catalogue) des autres a-t-il changé ? » — pas la photo (binaire, locale). */
async function catalogSignature(): Promise<string> {
  const products = (await listProducts())
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      price: p.price,
      category: p.category,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify(products);
}

/** Republie, pour CHAQUE écran employé, le sous-catalogue que le propriétaire lui a
 *  choisi — et lui seulement. Avant, un changement de catalogue repartait en un instantané
 *  que TOUT le groupe appliquait : un employé ne pouvait donc pas être privé d'un article.
 *
 * Republication gated par `catalogSignature` : SA part (le catalogue du propriétaire)
 * a-t-elle changé depuis le dernier envoi RÉUSSI ? Sans cette garde, un `force` à
 * l'aveugle réémittait un instantané identique à CHAQUE rotation — un doublon par
 * cycle, mesuré par transport-share/transport-employee. La signature n'est
 * mémorisée qu'après un push réussi : un échec ne borne rien. À l'intérieur,
 * `emitShareOps` (sans force) dédoublonne PAR PAIR sur `shared_signature`. Pousse
 * sur-le-champ (mini-push de fin de rotation) pour que le relais la détienne dès
 * ce cycle. */
export async function publishFreshCatalog(
  client: TransportClient,
  identity: SyncIdentity,
): Promise<void> {
  if (identity.role === "employee") return;
  const db = getDB();
  // Le catalogue local a-t-il changé depuis la dernière publication RÉUSSIE ?
  // Sinon : rien à republier — les pairs reçoivent exactement ce qu'ils ont déjà.
  const signature = await catalogSignature();
  const last = String((await db.settings.get(KEY_LAST_CATALOG_SIG))?.value ?? "");
  const premierePublication = last === "";
  if (!premierePublication && last === signature) return;

  const peers = await pairedEmployees(identity.shopId);
  const parts: { peerId: string; signature: string; at: number }[] = [];
  for (const peer of peers) {
    const part = await emitShareOps(peer);
    if (part) parts.push({ peerId: peer.id, signature: part.signature, at: part.at });
  }
  // La fenêtre anti-spam PAR ÉCRAN a serré la main sur tout : rien ne part, mais la
  // signature locale reste NON acquittée — la rotation suivante réessaie (cf. la
  // promesse de convergence au-dessus : rien n'est mémorisé avant un envoi parti).
  if (parts.length === 0) return;

  const pending = await listPendingOps(identity.shopId);
  if (pending.length > 0) {
    const signed = await signAll(pending);
    if (await client.push(identity.shopId, signed)) {
      await markOpsSynced(pending.map((o) => o.id));
      for (const part of parts) await markSharePublished(part.peerId, part.signature, part.at);
      await db.settings.put({ key: KEY_LAST_CATALOG_SIG, value: signature });
    }
  }
}

/**
 * Un écran demande l'instantané FRIS du catalogue du groupe : l'import du stock du
 *  propriétaire de son côté (« Importer le stock du propriétaire »). Article jetable —
 *  même `entity_id` (deviceId demandeur) — transporté par le relais, jamais l'orchestrateur ;
 *  le principal répond à son prochain cycle d'échange (20 s). */
export async function emitCatalogRequest(identity: SyncIdentity): Promise<void> {
  const db = getDB();
  const payload: CatalogueRequestPayload = { requester_id: identity.deviceId };
  await db.transaction("rw", db.sync_ops, db.settings, async () => {
    await emitOp(db, identity, {
      type: "catalogue.request",
      entity_id: identity.deviceId,
      payload,
    });
  });
}

/** Le meilleur nom de boutique disponible : `prefs.workspaceName` (enseigne validée à
 *  l'onboarding) devant la fiche profil — la fiche a pu rester sur le fallback « Ma boutique »
 *  si l'onboarding ne l'avait jamais écrite. Une fiche née avec le fallback n'est pas un nom. */
async function snapshotShopName(): Promise<string | undefined> {
  const db = getDB();
  const profile = await db.shop_profiles.get("me");
  const prefs = getPreferences();
  for (const name of [prefs.workspaceName, profile?.storeName]) {
    const trimmed = name?.trim();
    if (trimmed && trimmed !== "Ma boutique") return trimmed;
  }
  return undefined;
}
