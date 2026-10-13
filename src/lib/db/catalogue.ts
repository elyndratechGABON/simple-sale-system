import { getDB } from "./internal";
import type { CatalogueRequestPending } from "./types/records";

// ---------- Catalogue Requests (pending owner confirmation) ----------
/** Enregistre une demande d'import de catalogue envoyée par un employé. */
export async function addCatalogueRequest(
  request: Omit<CatalogueRequestPending, "status" | "snapshot_sent">,
): Promise<void> {
  const db = getDB();
  const existing = await db.catalogue_requests.get(request.id);
  if (existing && existing.status !== "expired") return; // déjà en attente
  await db.catalogue_requests.put({ ...request, status: "pending", snapshot_sent: false });
}

/** Liste les demandes en attente pour un shop (propriétaire). */
export async function listPendingCatalogueRequests(
  shopId: string,
): Promise<CatalogueRequestPending[]> {
  const db = getDB();
  return db.catalogue_requests
    .where("shop_id")
    .equals(shopId)
    .and((r) => r.status === "pending")
    .toArray();
}

/** Le propriétaire confirme : le snapshot pourra être envoyé au prochain cycle. */
export async function confirmCatalogueRequest(id: string): Promise<void> {
  const db = getDB();
  const req = await db.catalogue_requests.get(id);
  if (!req || req.status !== "pending") return;
  await db.catalogue_requests.put({ ...req, status: "confirmed", confirmed_at: Date.now() });
}

/** Le propriétaire refuse : aucune snapshot ne sera envoyé. */
export async function denyCatalogueRequest(id: string): Promise<void> {
  const db = getDB();
  const req = await db.catalogue_requests.get(id);
  if (!req || req.status !== "pending") return;
  await db.catalogue_requests.put({ ...req, status: "denied", denied_at: Date.now() });
}

/** Marque le snapshot comme envoyé après confirmation. */
export async function markCatalogueRequestSnapshotSent(id: string): Promise<void> {
  const db = getDB();
  const req = await db.catalogue_requests.get(id);
  if (!req || req.status !== "confirmed") return;
  await db.catalogue_requests.put({ ...req, snapshot_sent: true });
}

/** Nettoie les demandes expirées (plus de 24h sans réponse). */
export async function expireOldCatalogueRequests(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
  const db = getDB();
  const cutoff = Date.now() - maxAgeMs;
  const expired = await db.catalogue_requests
    .where("status")
    .equals("pending")
    .and((r) => r.created_at < cutoff)
    .toArray();
  for (const req of expired) {
    await db.catalogue_requests.put({ ...req, status: "expired", denied_at: Date.now() });
  }
  return expired.length;
}
