// Transport des opérations entre appareils — le relais PC Master comme rendez-vous.
//
// Contrat du relais (simple-sale-orchestrateur, dépôt Séparé — PAS implémenté ici) :
//   POST /api/v1/ops  { shop_id, ops: SyncOp[] }    → stocke. Idempotent par `id` : un
//                                                     appareil qui re-pousse les mêmes ops
//                                                     (échec d'acquittement local) ne fait
//                                                     pas de doublon.
//   GET  /api/v1/ops?shop_id=…                      → { ops: SyncOp[] } : TOUTES les ops du
//                                                     groupe, y compris celles de l'appelant.
//
// Le relais ne connait pas les ops : il les stocke et les rend sans les interpréter, sans
// les agréger, sans les trier. « Internet sert à se rencontrer, pas à être la base de
// données ». L'appareil, lui, filtre ses propres ops au pull et déduplique par
// `processed_ops` — l'ordre d'application reste local et déterministe.
//
// Règle d'or offline-first : RIEN ici ne jette. Push en échec (hors ligne, 5xx, absence de
// l'endpoint) → outbox conservée, l'appareil réessaiera au prochain tick. Pull en échec →
// on n'applique rien. Un relais muet n'a aucun effet sur la caisse.
import { applyRemoteOps } from "./apply";
import { isSharedGroup, getIdentity } from "./identity";
import { listPendingOps, markOpsSynced } from "./outbox";
import type { SyncOp } from "./types";

/** La bouche d'entrée/sortie d'un canal d'échange. Remplaçable inconditionnellement. */
export interface TransportClient {
  /** Pousse les ops locales vers le relais. `true` = le relais les a reçues. */
  push(shopId: string, ops: SyncOp[]): Promise<boolean>;
  /** Tire toutes les ops du groupe — y compris les siennes. */
  pull(shopId: string): Promise<SyncOp[]>;
}

/** Bilan d'un cycle d'échange, pour l'UI (indicateur de sync) et les tests. */
export interface SyncState {
  /** Ops locales acquittées auprès du relais (sorties de l'outbox). */
  pushed: number;
  /** Ops étrangères nouvelles appliquées. */
  applied: number;
  /** Ops déjà connues (les siennes, ou déjà consumées par `processed_ops`) — données, pas rejouées. */
  skipped: number;
  /** Ops étrangères présentes chez le relais (dont celles déjà appliquées). */
  remote: number;
}

/** Cycle complet d'un appareil : pousse son outbox, tire ce que les autres ont laissé,
 *  rejoue les ops étrangères. Jamais bloquant : tout est déjà protégé en amont. */
export async function exchangeOps(client: TransportClient): Promise<SyncState> {
  const identity = getIdentity();
  if (!isSharedGroup(identity.shopId)) return { pushed: 0, applied: 0, skipped: 0, remote: 0 };

  const pending = await listPendingOps(identity.shopId);
  let pushed = 0;
  if (pending.length > 0 && (await client.push(identity.shopId, pending))) {
    await markOpsSynced(pending.map((o) => o.id));
    pushed = pending.length;
  }

  const remote = await client.pull(identity.shopId);
  const foreign: SyncOp[] = [];
  let skipped = 0;
  for (const op of remote) {
    if (op.device_id === identity.deviceId) {
      skipped++;
      continue;
    }
    // Une approbation qui NOUS vise ne crée pas de fiche de soi-même : seul le registre
    // des pairs est concerné par cette décision, et il ne s'y enregistre pas lui-même.
    if (op.type === "device.approve" && op.entity_id === identity.deviceId) {
      skipped++;
      continue;
    }
    foreign.push(op);
  }
  const { applied } = await applyRemoteOps(foreign);
  return { pushed, applied, skipped, remote: foreign.length };
}

/** Adaptateur du relais PC Master en HTTP. `fetchImpl` injectable pour les tests.
 *  Échec = `false` / `[]`, jamais de throw — le relais est un accessoire, pas un goulot. */
export function relayTransport(
  baseUrl: string,
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch,
): TransportClient {
  return {
    async push(shopId: string, ops: SyncOp[]): Promise<boolean> {
      if (ops.length === 0) return true;
      try {
        const res = await fetchImpl(`${baseUrl}/api/v1/ops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop_id: shopId, ops }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    async pull(shopId: string): Promise<SyncOp[]> {
      try {
        const res = await fetchImpl(`${baseUrl}/api/v1/ops?shop_id=${encodeURIComponent(shopId)}`);
        if (!res.ok) return [];
        const data = (await res.json().catch(() => null)) as { ops?: SyncOp[] } | null;
        return Array.isArray(data?.ops) ? data.ops : [];
      } catch {
        return [];
      }
    },
  };
}
