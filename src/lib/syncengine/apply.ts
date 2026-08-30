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
import { getDB } from "../db";
import type { PosDatabase } from "../db";
import type {
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
    ],
    async () => {
      const seen = new Set<string>();
      const now = Date.now();
      let applied = 0;
      let skipped = 0;
      for (const op of sorted) {
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
          await db.paired_devices.put({
            id: op.device_id,
            shop_id: op.shop_id,
            last_seen: now,
            updated_at: now,
          });
        }
        applied++;
      }
      return { applied, skipped };
    },
  );
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
      const existing = await db.products.get(pl.product_id);
      if (!existing || existing.deleted_at) break;
      await db.products.put({ ...existing, ...pl.fields, ...touch() });
      break;
    }
    case "product.deleted": {
      const pl = op.payload as { product_id: string };
      const existing = await db.products.get(pl.product_id);
      if (!existing || existing.deleted_at) break;
      await db.products.put({ ...existing, ...touch(), deleted_at: Date.now() });
      break;
    }
    case "stock.adjusted": {
      const pl = op.payload as StockAdjustedPayload;
      if (typeof pl.delta !== "number" || !Number.isFinite(pl.delta)) break;
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
            await db.products.put({
              ...p,
              stock: Math.max(0, p.stock - item.quantity),
              ...touch(),
            });
          }
        }
      }
      break;
    }
    case "sale.cancelled": {
      const pl = op.payload as SaleCancelledPayload;
      const sale = await db.sales.get(pl.sale_id);
      if (!sale || sale.deleted_at) break;
      const deleted_at = Date.now();
      const items = await db.sale_items.where("sale_id").equals(sale.id).toArray();
      for (const item of items) {
        if (item.product_id) {
          const p = await db.products.get(item.product_id);
          if (p && Number.isFinite(p.stock)) {
            await db.products.put({ ...p, stock: p.stock + item.quantity, ...touch() });
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
      const existing = await db.clients.get(pl.client_id);
      if (!existing || existing.deleted_at) break;
      await db.clients.put({ ...existing, ...pl.fields, ...touch() });
      break;
    }
    case "client.deleted": {
      const pl = op.payload as { client_id: string };
      const existing = await db.clients.get(pl.client_id);
      if (!existing || existing.deleted_at) break;
      await db.clients.put({ ...existing, ...touch(), deleted_at: Date.now() });
      break;
    }
    case "device.announce": {
      // Une caisse se présente. Elle est `paired` si son code correspond à celui affiché
      // localement (preuve par le principal), sinon elle reste `pending` — sauf appareil
      // déjà pairé (re-annonce) ou rôle de confiance (owner/manager qui se présentent).
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
      const autoPaired = codeOk || wasPaired || pl.role === "owner" || pl.role === "manager";
      await db.paired_devices.put({
        ...existing,
        device_name: pl.employee_name || existing.device_name,
        role: pl.role ?? existing.role,
        public_key: pl.public_key || existing.public_key,
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
        status: "paired",
        paired_at: existing.paired_at ?? now,
        updated_at: now,
      });
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
