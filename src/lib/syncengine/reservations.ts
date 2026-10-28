// RÉSERVATION OPTIMISTE DU STOCK (Étape 2 — mission survente).
//
// Quand un vendeur pose un article dans son panier, tout autre écran de la boutique
// doit le voir sortir du disponible SANS attendre l'encaissement — et SANS écriture
// en base de données : le panier est volatile, sa trace ne doit pas survivre à une
// fermeture d'écran. Le décrément s'écrit au moment de l'encaissement ; vouloir
// « réserver » en base ferait vivre des annulations pour des ventes qui n'ont
// jamais existé.
//
// Le réservoir :
//   - Une op `stock.reserve` part à l'ajout-au-panier, `stock.release` à la
//     sortie du panier (retrait, vente encaissée, tournée posée, panier vidé) —
//     l'ÉCART est poussé, jamais l'état complet : un pair hors ligne rattrape
//     les deltas et finit juste.
//   - Opportuniste : une réservation doit être fraîche pour compter — le but du
//     panier est de couvrir l'écart entre « ajout » et « encaissement », pas
//     d'aspirer le stock. RESERVE_TTL_MS garde un vendeur appui-preparé sans
//     geler la boutique : un article réservé puis abandonné retourne au catalogue.
//   - La réception déduit du DISPONIBLE (copie produit en mémoire), pas de la
//     base : le stock écrit ne bouge qu'à la vente réelle (`sale.created`).

import { useEffect, useState } from "react";
import { getDB } from "@/lib/db";
import { getIdentity } from "./identity";
import { emitOp } from "./ops";
import type { SyncOp } from "./types";

/** Fiabilité d'éligibilité d'une réservation : vivante. */
const RESERVE_TTL_MS = 15 * 60_000;

interface ReserveEntry {
  qty: number;
  at: number;
}

/** Clé de registre : `${deviceId}|${productId}|${variantId ?? ""}` */
function reserveKey(deviceId: string, productId: string, variantId?: string): string {
  return `${deviceId}|${productId}|${variantId ?? ""}`;
}

const registry = new Map<string, ReserveEntry>();

let listeners: (() => void)[] = [];
let version = 0;

function bump() {
  version += 1;
  for (const ln of [...listeners]) ln();
}

/** Réactivité minimale pour l'UI : le composant s'abonne à la version du registre. */
export function useReservationsVersion(): number {
  const [v, setV] = useState(version);
  useEffect(() => {
    const ln = () => setV(version);
    listeners.push(ln);
    return () => {
      listeners = listeners.filter((l) => l !== ln);
    };
  }, []);
  return v;
}

function isLive(entry: ReserveEntry): boolean {
  return Date.now() - entry.at < RESERVE_TTL_MS;
}

/** Réception d'un `stock.reserve` d'un pair : plus de stock retenu. */
export function applyStockReserveOp(op: SyncOp): void {
  const pl = op.payload as { product_id: string; variant_id?: string; quantity: number };
  if (!op.device_id || !pl?.product_id || !(pl.quantity > 0)) return;
  if (op.created_at < Date.now() - RESERVE_TTL_MS) return; // rattrapage périmé
  const key = reserveKey(op.device_id, pl.product_id, pl.variant_id);
  const cur = registry.get(key);
  const qty = cur && isLive(cur) ? cur.qty + pl.quantity : pl.quantity;
  registry.set(key, { qty, at: Date.now() });
  bump();
}

/** Réception d'un `stock.release` d'un pair : le stock revient au disponible. */
export function applyStockReleaseOp(op: SyncOp): void {
  const pl = op.payload as { product_id: string; variant_id?: string; quantity: number };
  if (!op.device_id || !pl?.product_id || !(pl.quantity > 0)) return;
  const key = reserveKey(op.device_id, pl.product_id, pl.variant_id);
  const cur = registry.get(key);
  if (!cur) return;
  const qty = Math.max(0, cur.qty - pl.quantity);
  if (qty === 0) registry.delete(key);
  else registry.set(key, { qty, at: Date.now() });
  bump();
}

/**
 * Quantité déjà retenue sur un produit (ou une de ses variantes) par les AUTRES
 * écrans du groupe : à soustraire du `stock` fini pour afficher/encaisser le
 * disponible. Les réservations périmées sortent du compte.
 */
export function reservedAgainst(
  productId: string,
  opts?: { variantId?: string; excludeDeviceId?: string },
): number {
  let total = 0;
  for (const [key, entry] of registry) {
    if (!isLive(entry)) {
      registry.delete(key);
      continue;
    }
    const [, deviceId, reservedProduct, reservedVariant] = key.split("|");
    if (reservedProduct !== productId) continue;
    if (opts?.excludeDeviceId && deviceId === opts.excludeDeviceId) continue;
    if (opts?.variantId !== undefined && reservedVariant !== opts.variantId) continue;
    total += entry.qty;
  }
  return total;
}

/** Stock disponible à l'affichage et à la garde du panier : réservé sorti. */
export function availableStock(
  p: { id: string; stock: number; type?: string },
  opts?: { variantId?: string; excludeDeviceId?: string },
): number {
  if (p.type === "service" || !Number.isFinite(p.stock)) return p.stock;
  return Math.max(0, p.stock - reservedAgainst(p.id, opts));
}

/** Les réservations de CET écran, vivantes uniquement. */
function myReservations(deviceId: string): Map<string, ReserveEntry> {
  const mine = new Map<string, ReserveEntry>();
  for (const [key, entry] of registry) {
    if (!isLive(entry)) {
      registry.delete(key);
      continue;
    }
    if (key.startsWith(`${deviceId}|`)) mine.set(key, entry);
  }
  return mine;
}

/**
 * Égalise les réservations de CET écran sur son panier réel : émet `stock.reserve`
 * quand le panier grandit, `stock.release` quand il rétrécit. À appeler après chaque
 * modification du panier — émettre l'ÉCART, jamais l'état (rejouer un état complet
 * après un abandon de pair serait un double-comptage).
 *
 * `desired` : clé `${productId}|${variantId ?? ""}` → quantité totale du panier.
 */
export async function syncMyReservations(
  desired: Map<string, number>,
  identity: { deviceId: string } | null,
): Promise<void> {
  if (!identity) return;
  const full = await getIdentity();
  if (!full) return;
  const db = getDB();
  const before = myReservations(identity.deviceId);
  const wanted = new Map<string, number>();
  for (const [key, qty] of desired) {
    if (qty > 0) wanted.set(`${identity.deviceId}|${key}`, qty);
  }
  // Deltas positifs : nouvelles réservations (ou quantité accrue).
  for (const [key, qty] of wanted) {
    const prev = before.get(key);
    const delta = qty - (prev ? prev.qty : 0);
    if (delta <= 0) continue;
    const [, productId, variantId] = key.split("|");
    const payload = {
      product_id: productId,
      ...(variantId ? { variant_id: variantId } : {}),
      quantity: delta,
    };
    registry.set(key, { qty, at: Date.now() });
    await emitOp(db, full, { type: "stock.reserve", entity_id: productId, payload });
  }
  // Deltas négatifs : lignes réduites ou disparues → libération.
  for (const [key, prev] of before) {
    const next = wanted.get(key);
    const nextQty = next ?? 0;
    const delta = prev.qty - nextQty;
    if (delta <= 0) continue;
    const [, productId, variantId] = key.split("|");
    const payload = {
      product_id: productId,
      ...(variantId ? { variant_id: variantId } : {}),
      quantity: delta,
    };
    if (nextQty > 0) registry.set(key, { qty: nextQty, at: Date.now() });
    else registry.delete(key);
    await emitOp(db, full, { type: "stock.release", entity_id: productId, payload });
  }
  bump();
}
