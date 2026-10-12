// Barrel export du module transport (syncengine).
// Structure modulaire : chaque responsabilité dans son fichier, db déclaré UNE FOIS dans repository.ts.

export {
  // Types & constants
  type TransportClient,
  type SyncState,
  type SyncIdentity,
  type SyncOp,
  type PairedDevice,
  type CatalogueRequestPayload,
  type DeviceAnnouncePayload,
  type DeviceApprovePayload,
  SNAPSHOT_THROTTLE_MS,
  KEY_LAST_SNAPSHOT,
  KEY_LAST_CATALOG_SIG,
} from "./types";

export { makeSyncRepository, type SyncRepository } from "./repository";
export { exchangeOps } from "./exchangeOps";
export { relayTransport } from "./transportAdapter";
export { pushLocalOps, forcePushNow } from "./push";
export {
  pullAndApply,
  handleOwnerPostPull,
  handleEmployeePostPull,
  handleConfirmedCatalogueRequests,
} from "./pull";
export { catalogSignature, publishFreshCatalog } from "./catalog";
export { emitCatalogRequest } from "./catalogueRequest";
export { snapshotShopName } from "./shopName";
