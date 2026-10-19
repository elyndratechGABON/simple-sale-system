import type { Sale } from "@/lib/db";
import type { PairedDevice } from "@/lib/syncengine/types";

/** Début du mois courant (fenêtre par défaut du détail). */
export function monthStart(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Nom humain d'un vendeur sans nom posé : jamais deviné, le repli est explicite. */
export function sellerDisplay(name?: string, fallback: string = "Direct"): string {
  return name?.trim() ? name : fallback;
}

/** Formate le dernier contact en texte relatif. */
export function lastSeenLabel(ts?: number): string {
  if (!ts) return "Jamais";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return `Il y a ${Math.floor(diff / 86_400_000)} j`;
}

/**
 * Les ventes d'un écran : son `seller_device_id` exact, ou, pour les ventes
 * antérieures au suivi d'appareil, le nom du vendeur égal au nom de l'écran.
 * Une caisse propriétaire vend « direct » (aucun vendeur attaché).
 */
export function isOwnSale(sale: Sale, device: PairedDevice): boolean {
  if (device.role === "owner") return !sale.seller_device_id;
  return (
    sale.seller_device_id === device.id ||
    (!sale.seller_device_id &&
      Boolean(sale.seller_name) &&
      sale.seller_name?.trim() === device.device_name?.trim())
  );
}
