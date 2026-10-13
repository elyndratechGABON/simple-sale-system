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
//                                                     relais trace la fraîcheur par appareil
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
export { KEY_LAST_CATALOG_SIG, type TransportClient, type SyncState } from "./types";
export { relayTransport } from "./adapter";
export { emitCatalogRequest } from "./catalog";
export { exchangeOps } from "./exchangeOps";
