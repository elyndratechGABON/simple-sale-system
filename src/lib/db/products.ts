import { ensureIdentity, getIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";
import { alive, getDB, touch, uid } from "./internal";
import { productPatch } from "./patches";
import { recordMovement } from "./stock";
import type { Product, ProductVariant, SyncFields } from "./types/sync";

// ---------- Products ----------
export async function listProducts(): Promise<Product[]> {
  const all = await getDB().products.toArray();
  // `cost` est absent des produits créés avant le suivi du prix d'acquisition. Un store
  // IndexedDB ne contraint pas la forme des records : ajouter un champ ne demande aucune
  // migration, la normalisation se fait ici. Ne pas « simplifier » le `?? 0`.
  return alive(all)
    .map((p) => ({ ...p, cost: p.cost ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Un produit à variantes porte son stock DANS ses variantes — c'est l'invariant annoncé sur
 * `ProductVariant`. `stock` n'en est que la somme, appliquée ici, au seul endroit où TOUT
 * le monde écrit un produit (formulaire, onboarding, import JSON).
 *
 * Sans cette normalisation, un produit dont le stock n'a été saisi que dans les variantes
 * reste à 0 : l'alerte « rupture de stock » se déclenche alors que ses variantes sont en
 * rayon, et la pastille « stock faible » colle sur la carte en caisse.
 */
export function normalizeVariantStock<T extends { stock: number; variants?: ProductVariant[] }>(
  p: T,
): T {
  if (!p.variants?.length) return p;
  return { ...p, stock: p.variants.reduce((total, v) => total + (v.stock ?? 0), 0) };
}

/**
 * Le CONCEPT : une prestation (type « service ») n'a pas de stock — elle est TOUJOURS
 * illimitée, sur tous les écrans. Enforcé au seul endroit où tout le monde écrit un
 * produit, derrière la normalisation des variantes : aucune fiche service ne peut
 * exister avec un stock fini, ni localement, ni chez un pair qui appliquerait son op.
 */
export function enforceServiceUnlimited<T extends { type?: string; stock: number }>(p: T): T {
  if (p.type === "service" && Number.isFinite(p.stock)) {
    return { ...p, stock: Number.POSITIVE_INFINITY };
  }
  return p;
}

export async function addProduct(p: Omit<Product, "id" | keyof SyncFields>): Promise<Product> {
  await ensureIdentity();
  const product = enforceServiceUnlimited(normalizeVariantStock({ ...p, id: uid(), ...touch() }));
  const db = getDB();
  // Produit + op dans UNE transaction : un produit présent sans son op de création ne
  // pourrait jamais arriver seul sur un autre appareil.
  await db.transaction(
    "rw",
    db.products,
    db.stock_movements,
    db.sync_ops,
    db.settings,
    async () => {
      await db.products.put(product);
      // Stock initial > 0 : une trace de création, sinon le premier réapprovisionnement
      // paraîtrait avoir disparu du journal.
      if (Number.isFinite(product.stock) && product.stock > 0) {
        await db.stock_movements.put({
          id: uid(),
          product_id: product.id,
          product_name: product.name,
          delta: product.stock,
          reason: "creation",
          created_at: Date.now(),
        });
      }
      // Le stock ABSOLU part dans la création : il est le point de départ (`STOCK_INITIAL`)
      // à partir duquel les pairs appliqueront les deltas. Pas d'op `stock.adjusted` ici,
      // ce serait compter le stock initial deux fois.
      await emitOp(db, getIdentity(), {
        type: "product.created",
        entity_id: product.id,
        payload: { product },
      });
    },
  );
  return product;
}

export async function updateProduct(p: Product): Promise<void> {
  await ensureIdentity();
  const db = getDB();
  const previous = await db.products.get(p.id);
  // Normalisé AVANT la comparaison : le journal doit raconter la même correction que celle
  // réellement écrite, pas un écart entre le stock somme et le stock saisi dans le formulaire.
  const next = enforceServiceUnlimited(normalizeVariantStock({ ...p, ...touch() }));
  await db.transaction(
    "rw",
    db.products,
    db.stock_movements,
    db.sync_ops,
    db.settings,
    async () => {
      await db.products.put(next);
      // Le formulaire écrit un stock ABSOLU : s'il change, c'est une correction de
      // comptage et elle doit figurer au journal comme les autres variations.
      if (
        previous &&
        Number.isFinite(previous.stock) &&
        Number.isFinite(next.stock) &&
        next.stock !== previous.stock
      ) {
        await recordMovement(db, {
          product_id: next.id,
          product_name: next.name,
          delta: next.stock - previous.stock,
          reason: "correction",
          note: "Modification du produit",
        });
      }
      // Le stock N'EST PAS propagé par `product.updated` : il passe exclusivement par les
      // deltas (`stock.adjusted`). Une correction de comptage est un choix local — l'écart
      // réel entre le stock en rayon et le delta comptable se fige au prochain inventaire.
      const fields = productPatch(previous, next);
      if (fields) {
        await emitOp(db, getIdentity(), {
          type: "product.updated",
          entity_id: next.id,
          payload: { product_id: next.id, fields },
        });
      }
    },
  );
}

/**
 * Suppression LOGIQUE. Le produit disparaît de `listProducts` mais reste en base :
 * une suppression physique ne pourrait pas se propager à un autre appareil, et
 * l'historique des ventes garde de toute façon nom, prix et coût figés dans ses lignes.
 */
export async function deleteProduct(id: string): Promise<void> {
  await ensureIdentity();
  const db = getDB();
  const p = await db.products.get(id);
  if (!p) return;
  await db.transaction("rw", db.products, db.sync_ops, db.settings, async () => {
    await db.products.put({ ...p, ...touch(), deleted_at: Date.now() });
    await emitOp(db, getIdentity(), {
      type: "product.deleted",
      entity_id: id,
      payload: { product_id: id },
    });
  });
}

/**
 * Mise à jour en lot du prix d'acquisition (coût) de plusieurs produits.
 * Utilisé depuis Comptabilité → onglet "Coûts d'achat" : l'utilisateur coche plusieurs
 * produits et applique un coût commun.
 *
 * Règles :
 * - Ne touche JAMAIS à cost_at_sale (figé dans les ventes passées, AGENTS.md).
 * - Met à jour updated_at (Date.now()) : action volontaire → propagation P2P.
 * - Atomicité : UNE SEULE transaction Dexie pour tout le batch.
 * - Overwrite : tous les produits sélectionnés reçoivent le coût (même s'ils en avaient un).
 */
export async function bulkUpdateCost(ids: string[], cost: number): Promise<number> {
  await ensureIdentity();
  const db = getDB();
  const now = Date.now();
  let updated = 0;
  await db.transaction("rw", db.products, db.sync_ops, db.settings, async () => {
    for (const id of ids) {
      const existing = await db.products.get(id);
      if (!existing || existing.deleted_at) continue;
      const next = { ...existing, cost, ...touch() };
      await db.products.put(next);
      await emitOp(db, getIdentity(), {
        type: "product.updated",
        entity_id: id,
        payload: { product_id: id, fields: { cost, updated_at: now } },
      });
      updated++;
    }
  });
  return updated;
}
