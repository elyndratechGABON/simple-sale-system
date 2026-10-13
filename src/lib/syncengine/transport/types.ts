import type { SyncOp } from "../types";

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
