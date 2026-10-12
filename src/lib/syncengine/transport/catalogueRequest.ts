// Émission d'une demande d'import de catalogue (catalogue.request).
// Un écran demande l'instantané FRIS du catalogue du groupe : l'import du stock du
// propriétaire de son côté (« Importer le stock du propriétaire »). Article jetable —
// même `entity_id` (deviceId demandeur) — transporté par le relais, jamais l'orchestrateur ;
// le principal répond à son prochain cycle d'échange (20 s).

import { getDB } from "../../db";
import { emitOp } from "../ops";
import type { SyncIdentity } from "./types";

/** Émet une demande d'import de catalogue vers le relais. */
export async function emitCatalogRequest(identity: SyncIdentity): Promise<void> {
  // Note: on utilise getDB() directement ici car emitOp attend l'instance DB brute
  // pour sa transaction. C'est le seul endroit qui en a besoin.
  const db = getDB();
  const payload = { requester_id: identity.deviceId };

  await db.transaction("rw", db.sync_ops, db.settings, async () => {
    await emitOp(db, identity, {
      type: "catalogue.request",
      entity_id: identity.deviceId,
      payload,
    });
  });
}
