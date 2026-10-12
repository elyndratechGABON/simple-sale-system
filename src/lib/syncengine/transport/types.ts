// Transport des opérations entre appareils — le relais PC Master comme rendez-vous.
//
// Contrat du relais (simple-sale-orchestrateur, dépôt Séparé — PAS implémenté ici) :
//   POST /api/v1/ops  { shop_id, ops: SyncOp[] }    → stocke. Idempotent par `id` : un
//                                                     appareil qui re-pousse les mêmes ops
//                                                     (échec d'acquittement local) ne fait
//                                                     pas de doublon.
//   GET  /api/v1/ops?shop_id=…&device_id=…          → { ops: SyncOp[] } : TOUTES les ops du
//                                                     groupe, y compris celles de l'appelant.
//                                                     `device_id` = l'appareil QUI TIRE : le
//                                                     relais suit la fraîcheur par appareil
//                                                     et ne libère jamais de place tant
//                                                     qu'un appareil présent n'a pas tiré.
// En production le relais exige le secret `x-ops-token` (VITE_OPS_TOKEN à l'emploi) ; un
// relais sans jeton configuré (dev, orchestrateur historique) reste ouvert.
//
// Le relais ne connait pas les ops : il les stocke et les rend sans les interpréter, sans
// les agréger, sans les trier. « Internet sert à se rencontrer, pas à être la base de
// données ». L'appareil, lui, filtre ses propres ops au pull et déduplique par
// `processed_ops` — l'ordre d'application reste local et déterministe.
//
// Règle d'or offline-first : RIEN ici ne jette. Push en échec (hors ligne, 5xx, absence de
// l'endpoint) → outbox conservée, l'appareil réessaiera au prochain tick. Pull en échec →
// on n'applique rien. Un relais muet n'a aucun effet sur la caisse.

import type {
  CatalogueRequestPayload,
  DeviceAnnouncePayload,
  DeviceApprovePayload,
  SyncIdentity,
  SyncOp,
  PairedDevice,
  ProcessedOp,
} from "../types";

/** Interface du repository de synchronisation — DI friendly, testable. */
export interface SyncRepository {
  // paired_devices
  getPairedDevice(deviceId: string): Promise<PairedDevice | undefined>;
  getPairedDevicesByShop(shopId: string): Promise<PairedDevice[]>;
  putSettings(key: string, value: number | string): Promise<void>;
  getSettings(key: string): Promise<{ key: string; value: number | string } | undefined>;

  // processed_ops
  getProcessedOp(opId: string): Promise<ProcessedOp | undefined>;

  // products (pour signature catalogue)
  listProducts(): Promise<
    Array<{ id: string; name: string; stock: number; price: number; category: string }>
  >;
}

/** Une caisse qui importe le stock propriétaire ne doit pas faire répondre le propriétaire
 *  plus d'une fois par fenêtre : le relais rend la dernière op de toute façon, un rebouclage
 *  d'instantanés serait du bruit inutile. */
export const SNAPSHOT_THROTTLE_MS = 20_000;

export const KEY_LAST_SNAPSHOT = "syncengine_last_snapshot_at";

/** Publication continue du catalogue : le propriétaire maintient pour CHAQUE écran employé
 *  un instantané ABSOLU au relais — à chaque changement de son catalogue (création, vente,
 *  réappro, réception de la vente d'un employé qui modifie son stock). Ainsi « Importer le
 *  stock du propriétaire » n'attend plus le propriétaire : l'instantané est déjà au relais,
 *  le tir suffit. Deux garde-fous : la signature du catalogue (ne re-publier que si quelque
 *  chose a changé) et le délai par écran (pas une rafale pendant une fermeture de caisse). */
export const KEY_LAST_CATALOG_SIG = "syncengine_last_catalog_sig";

/** La bouche d'entrée/sortie d'un canal d'échange. Remplaçable inconditionnellement. */
export interface TransportClient {
  /** Pousse les ops locales vers le relais. `true` = le relais les a reçues. */
  push(shopId: string, ops: SyncOp[]): Promise<boolean>;
  /** Tire toutes les ops du groupe — y compris les siennes. `deviceId` identifie
   *  l'appareil qui tire : le relais suit la fraîcheur par appareil (purge sûre). */
  pull(shopId: string, deviceId: string): Promise<SyncOp[]>;
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

export type {
  CatalogueRequestPayload,
  DeviceAnnouncePayload,
  DeviceApprovePayload,
  SyncIdentity,
  SyncOp,
  PairedDevice,
  ProcessedOp,
};
