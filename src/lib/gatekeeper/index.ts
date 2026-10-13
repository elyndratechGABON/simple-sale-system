// Le GATEKEEPER — point d'entrée du protocole v2 de l'orchestrateur.
//
// « Principe du tourniquet » : le serveur ne pousse JAMAIS. Cette caisse sonne
// (handshake), repart avec les ordres non livrés (suspend / renew / broadcast_message),
// les applique, puis — seulement si son statut est « active » — pousse ses agrégats via
// /sync-data. L'accusé de réception est implicite : le prochain handshake annonce le
// dernier ordre appliqué, le serveur marque livré tout ce qui précède.
//
// Règle d'or offline-first : la moindre panne réseau laisse l'application inchangée —
// verrou, échéance et messages ne bougent que sur SUCCÈS d'un handshake. Seule
// exception : le verrou déjà en place est rechargé au démarrage depuis IndexedDB, pour
// qu'une caisse suspendue le reste même sans réseau.
export { APP_ORIGIN, APP_VERSION } from "./settings";
export type {
  AccountQuota,
  AdminCommand,
  CommandType,
  DeleteAccountRequest,
  HandshakeResult,
  KeywordClaim,
  KeywordJoinInput,
  KeywordJoinResult,
  LockReason,
  ShopDeletionRequestResult,
  SubscriptionRequestStatus,
} from "./types";
export {
  blessEmployeeDevice,
  getAccountQuota,
  getGraceEndsAt,
  getSubscriptionRequest,
  refreshAccountQuota,
  syncData,
} from "./account";
export {
  getLockSnapshot,
  loadLockState,
  resetDeviceConflict,
  resetGatekeeper,
  subscribeLock,
  unlockLocal,
} from "./lock";
export { consumeMessages } from "./commands";
export {
  ackKeywordReveal,
  clearKeywordClaim,
  getKeywordClaim,
  getKeywordToReveal,
  normKeyword,
  setKeywordClaim,
} from "./keyword";
export { joinByKeyword, resetKeywordBlock } from "./keyword-join";
export { handshake } from "./handshake";
export {
  clearDeleteAccountRequest,
  deleteShopRemote,
  flushPendingDeleteRequest,
  getDeleteAccountRequest,
  requestShopDeletion,
} from "./delete";
