// Types partagés du moteur de synchronisation local-first.
//
// Aucun import depuis `db` ici (feuille du graphe) : ces types sont consommés par les
// deux faces du moteur — `identity.ts` (qui ne lit qu'IndexedDB via db) et `db.ts`
// (qui écrit). Garder ce fichier sans dépendance évite tout cycle d'import.
/** Deux types de compte : le propriétaire et les employés. Le rôle `manager` a été
 *  supprimé — un ancien « gérant » se lit comme un employé. */
export type DeviceRole = "owner" | "employee";

export interface SyncIdentity {
  /** Identifiant d'appareil stable — unique par mobile. */
  deviceId: string;
  /** Groupe de partage : deux appareils du même shopId se synchronisent. */
  shopId: string;
  role: DeviceRole;
  employeeName: string;
  /** Numéro que l'employé déclare pour être joint par son patron. Volontairement hors du
   *  compte : c'est une identité de personne, pas une donnée d'abonnement. Vide = non
   *  déclaré, et l'interface le dit au lieu d'inventer une valeur. */
  employeePhone: string;
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

/** Registre local des appareils connus du même compte (post-pairing). */
export interface PairedDevice {
  id: string;
  /** Groupe de partage auquel appartient le pair. */
  shop_id: string;
  device_name?: string;
  /** Numéro déclaré par l'écrans (`device.announce`) : sert au patron à joindre la
   *  bonne personne dans « Activité du personnel ». Facultatif — un écran qui ne l'a
   *  pas déclaré n'affiche aucun numéro, jamais un numéro deviné. */
  phone?: string;
  role?: DeviceRole;
  public_key?: string;
  last_seen?: number;
  /** `paired` dès que l'appairage compte tenu du code ou d'une approbation ; `pending` sinon. */
  status?: "pending" | "paired";
  /** Horodatage du moment où l'appareil est devenu `paired`. Stable une fois posé. */
  paired_at?: number;
  /** `device_id` serveur (fiche boutique) de l'appareil : la cible exacte du `bless` qui
   *  rattache l'écran au compte marchand. Transporté par l'annonce, pas dérivable. */
  server_device_id?: string;
  /** Posé quand l'écran a été rattaché au compte côté orchestrateur (`/account/bless`). */
  blessed_at?: number;
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
 * de code n'est acceptée que pour un appareil déjà `paired` (ou un rôle `owner`).
 */
export interface DeviceAnnouncePayload {
  device_id: string;
  /** `device_id` de la fiche boutique (handshake serveur) : permis au principal
   *  d'appeler `/account/bless` pour rattacher l'écran au compte. */
  server_device_id?: string;
  public_key: string;
  employee_name: string;
  /** Numéro déclaré par la personne — facultatif, jamais déduit. */
  employee_phone?: string;
  role: DeviceRole;
  pair_code?: string;
}
/** Approbation manuelle d'une caisse restée `pending` (rôle conféré par le principal). */
export interface DeviceApprovePayload {
  org_device_id: string;
  role: DeviceRole;
  /**
   * Clé publique de l'appareil approuvé, recopiée de sa fiche par le principal. C'est
   * elle qui la PINSE : une annonce `pending` ne l week's pas fait (cf. `applyOp`,
   * `device.announce`), donc l'approbation est le seul autre moment où une clé peut
   * entrer en référence. Sans ce champ, un appareil approuvé à la main verrait ses
   * ops rejetées faute de clé connue.
   */
  public_key?: string;
}

/**
 * Instantané du catalogue vivant, envoyé à un appareil qui vient de rejoindre le groupe.
 *  Les produits portent leur stock ABSOLU courant : c'est le point de départ à partir duquel
 *  le nouvel écran rejouera les deltas ultérieurs. Idempotent (mêmes ids écrasés à l'identique).
 *
 *  `shop` porte l'identité de la boutique émettrice : LE RELAIS est aussi le garant du nom.
 *  Un QR généré quand l'onboarding n'avait pas encore écrit la fiche embarque « Ma boutique » ;
 *  le canal par lequel le relais livre déjà les stocks corrige alors le nom du nouvel écran
 *  (purement complémentaire — un écran déjà nommé localement n'est pas écrasé).
 */
export interface CatalogueSnapshotPayload {
  products: import("@/lib/db").Product[];
  shop?: { storeName: string; ownerName?: string };
}

/** Demande d'un instantané FRIS du catalogue : émise par l'écran qui importe le stock du
 *  propriétaire (« Importer le stock du propriétaire ») ; le propriétaire répond à son
 *  prochain cycle d'échange (via relais, sans dépendre de l'orchestrateur). */
export interface CatalogueRequestPayload {
  requester_id: string;
}

/** Clés de persistence de l'appairage P2P — partagées entre `db.ts` et `syncengine/pairing.ts`. */
export const PAIRING_KEYS = {
  code: "syncengine_pair_code",
  codeExpiresAt: "syncengine_pair_code_expires_at",
  /** Drapeau one-shot : l'appareil ne se ré-annonce jamais au groupe (idempotence de l'onboarding). */
  announced: "syncengine_announced",
  /** Nom + numéro au moment de la DERNIÈRE annonce. Une fiche change après coup (le
   *  commerçant corrige un numéro) ; sans cette trace, le one-shot ci-dessus garderait le
   *  patron sur une fiche périmée pour toujours. Compare pour ne ré-annoncer qu'au
   *  changement réel. */
  announcedProfile: "syncengine_announced_profile",
} as const;


/** Clés de persistence de l'identité — partagées entre `db.ts` et `identity.ts`. */
export const IDENTITY_KEYS = {
  device: "syncengine_device_id",
  shop: "syncengine_shop_id",
  role: "syncengine_role",
  employeeName: "syncengine_employee_name",
  employeePhone: "syncengine_employee_phone",
  publicKey: "syncengine_public_key_jwk",
  privateKey: "syncengine_private_key_jwk",
} as const;

/**
 * `shop_id` ADOPTÉ — celui que le relais a attribué au groupe lors d'un appairage
 * (`share_tokens.shop_id`).
 *
 * Source d'AUTORITÉ, prioritaire sur toute dérivation locale (cf. `deriveShopId`).
 * Sans lui, un employé rattaché par QR à un propriétaire porteur d'un `accountId`
 * serveur (`s_41`) retombe sur `SHA-256(téléphone|nom)` et atterrit dans un AUTRE
 * groupe : le vendeur encaisse, le patron ne voit rien, et rien ne le signale.
 *
 * Volontairement hors de `ShopProfile` : c'est une donnée d'identité d'appareil, au
 * même titre que `deviceId`, et elle doit être purgée par `resetDeviceIdentity`.
 */
export const IDENTITY_ADOPTED_SHOP_ID = "syncengine_adopted_shop_id";

/** Compteur de séquence des ops, PAR APPAREIL. Persévéré à part du journal (`settings`) :
 *  même si les ops acquittées sont purgées, le compteur ne repart jamais à zéro et aucun
 *  id `${device}:${seq}` n'est réutilisé. */
export const SEQUENCE_KEY = "syncengine_seq";
