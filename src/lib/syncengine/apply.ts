// Application d'opérations distantes — le miroir d'`ops.ts`.
//
// Contrat d'idempotence : chaque op appliquée est côtée dans `processed_ops` dans la MÊME
// transaction que ses écritures métier. Rejouer une op déjà consumée est un no-op, et un
// rejet de transaction à mi-chemin ne laisse aucune trace partielle — pas de vente sans
// son op, pas d'op sans ses écritures.
//
// Ordre d'application : tri GLOBAL déterministe (created_at, device_id, seq). Tous les
// appareils trient de la même façon → même chemin d'exécution → mêmes résultats. Les
// deltas de stock sont de toute façon commutatifs, l'ordre ne compte qu'aux champs
// « dernier écrit gagne » (produits, clients).
//
// Ne JAMAIS passer par les fonctions publiques de db.ts ici : elles re-émettraient des
// ops. Application directe sur les stores, sous le seul contrôle de `processed_ops`.
import { getDB, isClosed } from "../db";
import type { PosDatabase } from "../db";
import { getPreferences, savePreferences } from "../settings";
import { verifyOpSignature } from "./identity";
import type {
  CatalogueSnapshotPayload,
  ClientCreatedPayload,
  ClientUpdatedPayload,
  DeviceAnnouncePayload,
  DeviceApprovePayload,
  PairedDevice,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  SaleCancelledPayload,
  SaleCreatedPayload,
  StockAdjustedPayload,
  SyncOp,
} from "./types";
import { PAIRING_KEYS } from "./types";

/** Toutes les ops d'un seul tenant, dans l'ordre déterministe, atomiquement. */
export async function applyRemoteOps(ops: SyncOp[]): Promise<{ applied: number; skipped: number }> {
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
  const keys = await resolveTrustedKeys(db, sorted);
  const checks = await Promise.all(sorted.map((op) => verifyAgainst(op, keys.get(op.device_id))));
  // L'ordre global est RÉTABLI : `trusted` suit `sorted`, pas l'ordre des vérifications.
  const trusted = sorted.filter((_, i) => checks[i]);

  return db.transaction(
    "rw",
    [
      db.products,
      db.sales,
      db.sale_items,
      db.clients,
      db.processed_ops,
      db.paired_devices,
      db.settings,
      db.shop_profiles,
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
          // La décision du principal : sa propre fiche, si elle n'est pas déjà connue
          // (une annonce peut ne jamais l'avoir précédée).
          if (!(await db.paired_devices.get(op.device_id))) {
            await db.paired_devices.put({
              id: op.device_id,
              shop_id: op.shop_id,
              last_seen: now,
              updated_at: now,
            });
          }
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
}

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
async function resolveTrustedKeys(db: PosDatabase, ops: SyncOp[]): Promise<Map<string, string>> {
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
    if (peer.public_key && !keys.has(peer.id)) keys.set(peer.id, peer.public_key);
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
  const [codeRow, expRow] = await Promise.all([
    db.settings.get(PAIRING_KEYS.code),
    db.settings.get(PAIRING_KEYS.codeExpiresAt),
  ]);
  if (pl.pair_code && codeRow?.value === pl.pair_code && Number(expRow?.value ?? 0) > Date.now()) {
    return true; // le secret que le propriétaire affiche, jamais envoyé
  }
  // Groupe vide : premier écran du commerce. Rien à protéger — c'est la confiance
  // initiale, celle qui existait avant les signatures.
  return (await db.paired_devices.where("shop_id").equals(op.shop_id).count()) === 0;
}

/**
 * L'op est-elle authentique ? Une op sans signature est TOUJOURS refusée : tolérer
 * l'absence laisserait exactement la faille qu'on ferme (l'attaquant omet le champ).
 * C'est le coût du déploiement — une caisse pas encore mise à jour est ignorée au lieu
 * d'appliquer ses ops, ses ventes convergeront au rollout suivant.
 */
async function verifyAgainst(op: SyncOp, publicKey: string | undefined): Promise<boolean> {
  if (!op.sig) return false;
  if (!publicKey) return false;
  return verifyOpSignature(op, publicKey);
}

function compareOps(a: SyncOp, b: SyncOp): number {
  if (a.created_at !== b.created_at) return a.created_at - b.created_at;
  if (a.device_id !== b.device_id) return a.device_id < b.device_id ? -1 : 1;
  return a.seq - b.seq;
}

async function applyOp(db: PosDatabase, op: SyncOp): Promise<void> {
  switch (op.type) {
    case "product.created": {
      const pl = op.payload as ProductCreatedPayload;
      if (!pl?.product?.id || pl.product.deleted_at) break;
      // Upsert : le rejeu d'un pair ne doit pas écraser une suppression locale.
      const existing = await db.products.get(pl.product.id);
      if (existing?.deleted_at) break;
      await db.products.put(pl.product);
      break;
    }
    case "product.updated": {
      const pl = op.payload as ProductUpdatedPayload;
      if (!pl?.product_id) break;
      const existing = await db.products.get(pl.product_id);
      if (!existing || existing.deleted_at) break;
      await db.products.put({ ...existing, ...pl.fields, ...touch() });
      break;
    }
    case "product.deleted": {
      const pl = op.payload as { product_id: string };
      if (!pl?.product_id) break;
      const existing = await db.products.get(pl.product_id);
      if (!existing || existing.deleted_at) break;
      await db.products.put({ ...existing, ...touch(), deleted_at: Date.now() });
      break;
    }
    case "stock.adjusted": {
      const pl = op.payload as StockAdjustedPayload;
      if (!pl?.product_id || typeof pl.delta !== "number" || !Number.isFinite(pl.delta)) break;
      const existing = await db.products.get(pl.product_id);
      // Stock illimité : rien à ajuster. Produit absent : il arrivera avec sa création.
      if (!existing || existing.deleted_at || !Number.isFinite(existing.stock)) break;
      await db.products.put({
        ...existing,
        stock: Math.max(0, existing.stock + pl.delta),
        ...touch(),
      });
      break;
    }
    case "sale.created": {
      const pl = op.payload as SaleCreatedPayload;
      if (!pl?.sale?.id || pl.sale.deleted_at) break;
      await db.sales.put(pl.sale);
      for (const item of pl.items ?? []) {
        if (item.id) await db.sale_items.put(item);
        // Miroir de la caisse émettrice : l'achat sort du stock à la commande. Le stocket
        // le déficit se portent à vue du pair comme sur l'appareil d'origine.
        if (item.product_id) {
          const p = await db.products.get(item.product_id);
          if (p && Number.isFinite(p.stock)) {
            // Variante : le stock a quitté la VARIANTE sur la caisse émettrice (comme
            // `applyStockDelta`) — le pair doit ajuster la même, pas le stock global.
            const variant = item.variant_id && p.variants?.find((v) => v.id === item.variant_id);
            await db.products.put(
              variant
                ? {
                    ...p,
                    variants: (p.variants ?? []).map((v) =>
                      v.id === item.variant_id
                        ? { ...v, stock: Math.max(0, (v.stock ?? 0) - item.quantity) }
                        : v,
                    ),
                    ...touch(),
                  }
                : {
                    ...p,
                    stock: Math.max(0, p.stock - item.quantity),
                    ...touch(),
                  },
            );
          }
        }
      }
      break;
    }
    case "sale.cancelled": {
      const pl = op.payload as SaleCancelledPayload;
      if (!pl?.sale_id) break;
      const sale = await db.sales.get(pl.sale_id);
      if (!sale || sale.deleted_at) break;
      // Miroir de la garde locale `cancelSale` : une vente verrouillée — clôturée à la
      // main ou écoulée depuis 24 h — n'est pas annulable, même quand l'op arrive d'un
      // pair. L'émetteur a déjà refusé de l'annuler sur sa machine ; un décalage
      // d'horloge ne doit pas pouvoir réécrire un historique clôturé ici non plus.
      if (isClosed(sale)) break;
      const deleted_at = Date.now();
      const items = await db.sale_items.where("sale_id").equals(sale.id).toArray();
      for (const item of items) {
        if (item.product_id) {
          const p = await db.products.get(item.product_id);
          if (p && Number.isFinite(p.stock)) {
            const variant = item.variant_id && p.variants?.find((v) => v.id === item.variant_id);
            await db.products.put(
              variant
                ? {
                    ...p,
                    variants: (p.variants ?? []).map((v) =>
                      v.id === item.variant_id
                        ? { ...v, stock: (v.stock ?? 0) + item.quantity }
                        : v,
                    ),
                    ...touch(),
                  }
                : { ...p, stock: p.stock + item.quantity, ...touch() },
            );
          }
        }
        if (!item.deleted_at) {
          await db.sale_items.put({ ...item, ...touch(), deleted_at });
        }
      }
      await db.sales.put({ ...sale, ...touch(), deleted_at });
      break;
    }
    case "client.created": {
      const pl = op.payload as ClientCreatedPayload;
      if (!pl?.client?.id) break;
      const existing = await db.clients.get(pl.client.id);
      if (existing?.deleted_at) break;
      await db.clients.put(pl.client);
      break;
    }
    case "client.updated": {
      const pl = op.payload as ClientUpdatedPayload;
      if (!pl?.client_id) break;
      const existing = await db.clients.get(pl.client_id);
      if (!existing || existing.deleted_at) break;
      await db.clients.put({ ...existing, ...pl.fields, ...touch() });
      break;
    }
    case "client.deleted": {
      const pl = op.payload as { client_id: string };
      if (!pl?.client_id) break;
      const existing = await db.clients.get(pl.client_id);
      if (!existing || existing.deleted_at) break;
      await db.clients.put({ ...existing, ...touch(), deleted_at: Date.now() });
      break;
    }
    case "device.announce": {
      // Une caisse se présente. Elle est `paired` si son code correspond à celui affiché
      // localement (preuve par le principal), sinon elle reste `pending` — sauf appareil
      // déjà pairé (re-annonce) ou rôle de confiance (owner qui se présente).
      const pl = op.payload as DeviceAnnouncePayload;
      if (!pl?.device_id) break;
      const now = Date.now();
      const existing =
        (await db.paired_devices.get(pl.device_id)) ??
        ({ id: pl.device_id, shop_id: op.shop_id, updated_at: now } satisfies PairedDevice);
      const [activeCode, expiresAt] = await Promise.all([
        db.settings.get(PAIRING_KEYS.code),
        db.settings.get(PAIRING_KEYS.codeExpiresAt),
      ]);
      const codeOk = Boolean(
        pl.pair_code && activeCode?.value === pl.pair_code && Number(expiresAt?.value ?? 0) > now,
      );
      const wasPaired = existing.status === "paired";
      // Le rôle d'une annonce n'est reconnu qu'au premier contact (aucune fiche) ou avec
      // un code de paire juste : une fois l'appareil au registre — même `pending` —, seul
      // le principal peut le changer (`device.approve`). Un employé pairé qui re-annoncerait
      // `role: "owner"` ne se promeut donc pas : même règle que l'assistant de jonction,
      // qui n'a jamais créé de second propriétaire.
      const firstSighting = !existing.role && !existing.status;
      const role = pl.role && (codeOk || firstSighting) ? pl.role : existing.role;
      const autoPaired = codeOk || wasPaired || (pl.role === "owner" && firstSighting);

      // PREMIER CONTACT. Un groupe sans aucun appareil connu n'a rien à protéger : la
      // confiance initiale y est implicite (c'est ce que veut dire « la première caisse
      // du commerce »). Dès qu'un appareil est au registre, en revanche, une annonce
      // sans code ne doit plus pouvoir s'installer comme autorité — c'est là que
      // l'attaquant frappe.
      const groupEmpty =
        (await db.paired_devices.where("shop_id").equals(op.shop_id).count()) === 0;

      // La clé publique n'est PINSÉE que sur une annonce PROUVÉE : le code de paire
      // correct, un appareil déjà au registre, ou le tout premier appareil d'un groupe
      // encore vide. Ni le `pending` ni l'auto-pairage de rôle ne suffisent — ce sont des
      // déclarations de l'op lui-même, alors que la signature d'une annonce d'appareil
      // inconnu ne peut pas encore être vérifiée (cf. `isTrustedOp`). Épingler sur cette
      // base laisserait un attaquant s'annoncer `owner` dans un groupe DÉJÀ peuplé, faire
      // pincer SA clé, puis faire vérifier par `verifyOpSignature` toutes les ops qu'il
      // signerait ensuite.
      const pinned = codeOk || wasPaired || groupEmpty;
      await db.paired_devices.put({
        ...existing,
        device_name: pl.employee_name || existing.device_name,
        role,
        ...(pinned && pl.public_key ? { public_key: pl.public_key } : {}),
        server_device_id: pl.server_device_id || existing.server_device_id,
        status: autoPaired ? "paired" : "pending",
        paired_at: autoPaired ? (existing.paired_at ?? now) : existing.paired_at,
        updated_at: now,
      });
      break;
    }
    case "device.approve": {
      // Décision du principal : l'appareil visé est `paired` et reçoit son rôle partout
      // ailleurs dans le groupe. (Chaque écran ignore l'approbation qui le vise — pas de
      // fiche de soi-même — voir `exchangeOps`.)
      const pl = op.payload as DeviceApprovePayload;
      if (!pl?.org_device_id) break;
      const now = Date.now();
      const existing =
        (await db.paired_devices.get(pl.org_device_id)) ??
        ({ id: pl.org_device_id, shop_id: op.shop_id, updated_at: now } satisfies PairedDevice);
      await db.paired_devices.put({
        ...existing,
        role: pl.role ?? existing.role,
        // L'approbation est une décision du PRINCIPAL, dont la signature est vérifiée
        // ci-dessus : elle peut donc pincer la clé de l'appareil qu'elle approuve. La
        // clé vient de sa fiche (`pending`), pas de l'op — un attaquant ne peut pas
        // faire approuver sa propre clé.
        ...((pl.public_key ?? existing.public_key)
          ? { public_key: pl.public_key ?? existing.public_key }
          : {}),
        status: "paired",
        paired_at: existing.paired_at ?? now,
        updated_at: now,
      });
      break;
    }
    case "catalogue.snapshot": {
      // L'instantané sert de BOOTSTRAP à un écran qui rejoint : les produits qu'il ne
      // connaît pas encore sont créés à la valeur ABSOLUE portée par l'op (point de
      // départ de ses deltas). Un produit DÉJÀ présent n'est en revanche ni écrasé ni
      // ajusté : son stock est arrivé par deltas (commutatifs), et un instantané pris
      // AVANT une vente que le pair compte déjà « ressusciterait » des unités vendues.
      // Toute correction de stock passe par `stock.adjusted`, jamais par l'instantané.
      const pl = op.payload as CatalogueSnapshotPayload;
      for (const p of pl?.products ?? []) {
        if (!p?.id || p.deleted_at) continue;
        const existing = await db.products.get(p.id);
        if (existing) continue;
        await db.products.put({ ...p, ...touch() });
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
      break;
    }
    case "category.created":
      // Les catégories personnalisées vivent dans les préférences (localStorage, par
      // appareil). Convergence différée à un futur store partagé : l'op est côtée
      // acquittée, l'émetteur ne renverra pas la même création indéfiniment.
      break;
  }
}

const touch = () => ({ updated_at: Date.now(), sync_status: "local" as const });
