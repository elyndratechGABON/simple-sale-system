// Types partagés du moteur de synchronisation local-first.
//
// Aucun import depuis `db` ici (feuille du graphe) : ces types sont consommés par les
// deux faces du moteur — `identity.ts` (qui ne lit qu'IndexedDB via db) et `db.ts`
// (qui écrit). Garder ce fichier sans dépendance évite tout cycle d'import.
//
// (identity.ts) identité et clés ; (ops.ts) journal d'opérations ; (peers.ts) appareils
// pairés ; (payloads.ts) formes des payloads typés ; (keys.ts) clés de persistence.
export { IDENTITY_KEYS, IDENTITY_ADOPTED_SHOP_ID, PAIRING_KEYS, SEQUENCE_KEY } from "./keys";
export type { DeviceKeys, DeviceRole, SyncIdentity } from "./identity";
export type { OpType, ProcessedOp, SyncOp } from "./ops";
export type {
  ChargeDeletedPayload,
  ChargeSavedPayload,
  DeviceAnnouncePayload,
  CatalogueRequestPayload,
  CatalogueSnapshotPayload,
  CategoryCreatedPayload,
  ClientCreatedPayload,
  ClientUpdatedPayload,
  DeviceApprovePayload,
  DeviceLeavePayload,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  SaleCancelledPayload,
  SaleCreatedPayload,
  StockAdjustedPayload,
} from "./payloads";
export type { PairedDevice, ShareMode } from "./peers";
