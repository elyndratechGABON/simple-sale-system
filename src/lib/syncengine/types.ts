// Types partagés du moteur de synchronisation local-first.
//
// Aucun import depuis `db` ici (feuille du graphe) : ces types sont consommés par les
// deux faces du moteur — `identity.ts` (qui ne lit qu'IndexedDB via db) et `db.ts`
// (qui écrit). Garder ce fichier sans dépendance évite tout cycle d'import.
export type DeviceRole = "owner" | "manager" | "employee";

export interface SyncIdentity {
  /** Identifiant d'appareil stable — unique par mobile. */
  deviceId: string;
  /** Groupe de partage : deux appareils du même shopId se synchronisent. */
  shopId: string;
  role: DeviceRole;
  employeeName: string;
}

export interface DeviceKeys {
  /** Clé publique (JWK, série). Partagée via le pairing. */
  publicKey: string;
  /** Clé privée (JWK, série). NE DOIT JAMAIS quitter l'appareil. */
  privateKey: string;
}

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
  | "device.approve";

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
}

/** Table de déduplication : un id d'op déjà appliquée = une application de moins. */
export interface ProcessedOp {
  id: string;
  processed_at: number;
}

/** Registre local des appareils connus du même compte (post-pairing). */
export interface PairedDevice {
  id: string;
  /** Groupe de partage auquel appartient le pair. */
  shop_id: string;
  device_name?: string;
  role?: DeviceRole;
  public_key?: string;
  last_seen?: number;
  /** `paired` dès que l'appairage compte tenu du code ou d'une approbation ; `pending` sinon. */
  status?: "pending" | "paired";
  /** Horodatage du moment où l'appareil est devenu `paired`. Stable une fois posé. */
  paired_at?: number;
  updated_at: number;
}

// Payloads typés des opérations (documents : la forme exacte qu'un autre appareil
// acceptera au rejeu). Tout reste `unknown` au stockage, le typage vit ici et à l'apply.
export interface SaleCreatedPayload {
  sale: import("@/lib/db").Sale;
  items: import("@/lib/db").SaleItem[];
}
export interface SaleCancelledPayload {
  sale_id: string;
}
export interface StockAdjustedPayload {
  product_id: string;
  delta: number;
}
export interface CategoryCreatedPayload {
  name: string;
}
export interface ProductCreatedPayload {
  product: import("@/lib/db").Product;
}
export interface ProductUpdatedPayload {
  product_id: string;
  fields: Partial<
    Omit<
      import("@/lib/db").Product,
      "id" | "stock" | "photo" | keyof import("@/lib/db").SyncFields | "last_op"
    >
  >;
}
export interface ClientCreatedPayload {
  client: import("@/lib/db").Client;
}
export interface ClientUpdatedPayload {
  client_id: string;
  fields: Partial<
    Omit<import("@/lib/db").Client, "id" | keyof import("@/lib/db").SyncFields | "last_op">
  >;
}
/**
 * Une caisse se présente au groupe : nom, rôle, clé publique. `pair_code` est le code
 * de paire affiché par le principal — la seule preuve dont ce groupe dispose. L'absence
 * de code n'est acceptée que pour un appareil déjà `paired` (ou un rôle `owner`/`manager`).
 */
export interface DeviceAnnouncePayload {
  device_id: string;
  public_key: string;
  employee_name: string;
  role: DeviceRole;
  pair_code?: string;
}
/** Approbation manuelle d'une caisse restée `pending` (rôle conféré par le principal). */
export interface DeviceApprovePayload {
  org_device_id: string;
  role: DeviceRole;
}

/** Clés de persistence de l'appairage P2P — partagées entre `db.ts` et `syncengine/pairing.ts`. */
export const PAIRING_KEYS = {
  code: "syncengine_pair_code",
  codeExpiresAt: "syncengine_pair_code_expires_at",
  /** Drapeau one-shot : l'appareil ne se re-annonce jamais au groupe (idempotence de l'onboarding). */
  announced: "syncengine_announced",
} as const;

/** Clés de persistence de l'identité — partagées entre `db.ts` et `identity.ts`. */
export const IDENTITY_KEYS = {
  device: "syncengine_device_id",
  shop: "syncengine_shop_id",
  role: "syncengine_role",
  employeeName: "syncengine_employee_name",
  publicKey: "syncengine_public_key_jwk",
  privateKey: "syncengine_private_key_jwk",
} as const;

/** Compteur de séquence des ops, PAR APPAREIL. Persévéré à part du journal (`settings`) :
 *  même si les ops acquittées sont purgées, le compteur ne repart jamais à zéro et aucun
 *  id `${device}:${seq}` n'est réutilisé. */
export const SEQUENCE_KEY = "syncengine_seq";
