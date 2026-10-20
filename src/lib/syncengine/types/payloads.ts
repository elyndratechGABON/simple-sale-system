import type { DeviceRole } from "./identity";

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
export interface StockLowPayload {
  product_id: string;
  device_id: string;
  stock: number;
  threshold: number;
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
/**
 * Charge enregistrée ou modifiée — UN SEUL op pour les deux, sans `charge.created`
 * distinct. Conséquence directe : l'op porte les 6 champs métier COMPLETS, pas un
 * `Partial`. L'émetteur (`saveCharge`) les envoie tous à chaque écriture, donc le
 * `Partial` était une fiction ; et surtout il rendait le handler incapable de CRÉER la
 * ligne, faute de quoi une charge nouvelle n'arriverait jamais chez le pair.
 *
 * La montée reste bornée : seuls ces 6 champs voyagent. Ni `deleted_at` ni `sync_status`
 * ne sont transmissibles — un pair ne peut donc pas ressusciter une charge effacée ni
 * corrompre le moteur (même garantie que `ProductUpdatedPayload`).
 */
export interface ChargeSavedPayload {
  charge_id: string;
  fields: Omit<import("@/lib/db").Charge, "id" | keyof import("@/lib/db").SyncFields | "last_op">;
}
/** Suppression LOGIQUE : le pair pose `deleted_at`, il n'efface rien (cf. `alive()`). */
export interface ChargeDeletedPayload {
  charge_id: string;
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
  /** Destinataire EXCLUSIF de l'instantané, si le propriétaire partage une sélection.
   *  Absent = historique : le catalogue entier, pour tout le groupe (le comportement
   *  d'avant). Présent, l'écran visé l'applique, tous les AUTRES l'ignorent — c'est ce
   *  qui permet de partager un choix différent à chaque employé. */
  target_device_id?: string;
}

/** Demande d'un instantané FRIS du catalogue : émise par l'écran qui importe le stock du
 *  propriétaire (« Importer le stock du propriétaire ») ; le propriétaire répond à son
 *  prochain cycle d'échange (via relais, sans dépendre de l'orchestrateur). */
export interface CatalogueRequestPayload {
  requester_id: string;
}
