// Émission d'opérations dans le journal local.
//
// Le contrat d'atomicité : l'op et la modification métier qu'elle décrit sont écrites
// dans la MÊME transaction Dexie. Une vente enregistrée sans son op (ou une op sans sa
// vente) corromprait silencieusement la convergence. `emitOp` doit donc être appelé DANS
// le callback d'un `db.transaction("rw", ...)` qui porte déjà les stores concernés —
// `db.sync_ops` et `db.settings` compris.
//
// La séquence (`seq`) est un compteur monotone PAR APPAREIL, persévéré dans `settings`
// en dehors du journal (cf. `SEQUENCE_KEY`). Limite connue : deux onglets du même mobile
// qui écriraient simultanément liraient le même compteur et produiraient un id dupliqué.
// Pour un appareil ouvrant une seule caisse à la fois, le risque est nul.
import type { PosDatabase } from "../db";
import { signOp } from "./identity";
import type { OpType, SyncIdentity, SyncOp } from "./types";
import { SEQUENCE_KEY } from "./types";

export function shortDeviceId(deviceId: string): string {
  return deviceId.replace(/-/g, "").slice(0, 8);
}

// ── Allègement des payloads (anti-crash mémoire, mission outbox) ─────────────────
// Une photo dataURL pèse 30-80 Ko ; `product.created` portait le produit ENTIER (photo
// comprise), et un catalogue s'accumulait en outbox : 3746 ops = 173 Mo de RAM au
// démarrage. Les images vivent DANS la table `products` locale (IndexedDB, lue en
// continu par les écrans) — elles ne voyagent plus dans le journal d'ops.
//
// Le scrub est génériquel et borné en profondeur : toute clé `photo`/`image` portant
// un dataURL est retirée, à tous les niveaux (produit, variantes, snapshot de
// catalogue). Un rejeu n'a rien à reconstruire : l'image n'a jamais été du canal ops.
const SCRUB_DEPTH = 4;

function allegerPayload(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= SCRUB_DEPTH) return value;
  if (Array.isArray(value)) return value.map((v) => allegerPayload(v, depth + 1));
  const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const [key, val] of Object.entries(out)) {
    if (
      (key === "photo" || key === "image") &&
      typeof val === "string" &&
      val.startsWith("data:image")
    ) {
      delete out[key];
    } else if (val !== null && typeof val === "object") {
      out[key] = allegerPayload(val, depth + 1);
    }
  }
  return out;
}

/**
 * Signe un lot d'ops destined au réseau. Hors transaction par construction — voir
 * `emitOp`. Séquentiel plutôt que `Promise.all` : WebCrypto est asynchrone, on veut le
 * même ordre de sortie que d'entrée, et le lot est petit (une rotation de caisse).
 */
export async function signAll(ops: SyncOp[]): Promise<SyncOp[]> {
  const out: SyncOp[] = [];
  for (const op of ops) out.push(await signOp(op));
  return out;
}

export async function emitOp(
  db: PosDatabase,
  identity: SyncIdentity,
  input: { type: OpType; entity_id: string; payload: unknown; created_at?: number },
): Promise<SyncOp> {
  const prev = (await db.settings.get(SEQUENCE_KEY))?.value;
  const seq = (typeof prev === "number" ? prev : 0) + 1;
  await db.settings.put({ key: SEQUENCE_KEY, value: seq });
  const op: SyncOp = {
    id: `${shortDeviceId(identity.deviceId)}:${seq}`,
    shop_id: identity.shopId,
    device_id: identity.deviceId,
    seq,
    type: input.type,
    entity_id: input.entity_id,
    payload: allegerPayload(input.payload),
    created_at: input.created_at ?? Date.now(),
    status: "pending",
  };
  // NON signé ici, et c'est délibéré : signer est une promesse WebCrypto, or `emitOp`
  // est appelé DANS une transaction Dexie. L'await de la signature ferait committer la
  // transaction sous les pieds de l'appelant (`PrematureCommitError`) et casserait
  // l'atomicité op + écriture métier — la garantie la plus precious du moteur.
  // La signature est apposée au moment du PUSH (`exchangeOps`), hors transaction.
  // Une op locale non signée reste donc en base : sans effet, elle ne quitte l'appareil
  // que signée, et une op reçue qui ne se vérifie pas est refusée à l'application.
  await db.sync_ops.put(op);
  return op;
}
