export type OpType =
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "stock.adjusted"
  | "sale.created"
  | "sale.cancelled"
  | "client.created"
  | "client.updated"
  | "client.deleted"
  | "category.created"
  | "device.announce"
  | "device.approve"
  | "catalogue.snapshot"
  | "catalogue.request";

/** Une opération du journal. Idempotente : rejouée, elle ne doit produire qu'UN effet. */
export interface SyncOp {
  /** `${shortDeviceId}:${seq}` — stable, triable, unique. */
  id: string;
  shop_id: string;
  device_id: string;
  /** Compteur monotone par appareil. */
  seq: number;
  type: OpType;
  entity_id: string;
  /** JSON-serialisable. Les lignes de vente partent DANS l'op, jamais ailleurs. */
  payload: unknown;
  created_at: number;
  /** Cycle de vie dans l'outbox local. */
  status: "pending" | "synced";
  /**
   * Signature RSA-OAEP/SHA-256, base64, de `signableBody()` par la clé PRIVÉE de
   * `device_id`. Vérifiée à l'application contre la clé publique pairée.
   *
   * C'est ce qui distingue une opération émise par un appareil authentifié d'une
   * opération injectée par quiconque peut écrire au relais : le relais est aveugle,
   * `shop_id` vient du client, et rien d'autre ne prouvait l'origine de l'op. Sans
   * signature, un jeton lu dans le bundle suffisait à écrire dans la caisse d'autrui.
   *
   * Absente sur les ops émises avant ce déploiement (dépôt tiers, ancien client) :
   * l'reception les tolère (`verifyOpSignature` → `true` sur absence) pour ne pas
   * perdre l'historique. Cette tolérance est ce qui laisse la fenêtre ouverte — elle
   * se ferme quand tous les clients sont à jour et qu'on retire le cas.
   */
  sig?: string;
}

/** Table de déduplication : un id d'op déjà appliquée = une application de moins. */
export interface ProcessedOp {
  id: string;
  processed_at: number;
}
