import type { SyncFields } from "./sync";

/**
 * Identité de l'établissement qui utilise la caisse : c'est l'inscription de la boutique
 * dans l'orchestrateur (le PC du commerçant). Quatre infos saisies une fois dans
 * Paramètres, pré-enregistrées localement, puis poussées à chaque synchronisation.
 *
 * `deviceId` est l'identifiant d'appareil que l'orchestrateur voit : généré une seule
 * fois à la création, stable ensuite. `registrationDate` ne change jamais. `expiryDate`
 * est fixée localement à l'essai de 30 jours, puis ÉCRASÉE par l'orchestrateur, qui fait
 * foi sur les prolongations.
 */
export interface ShopProfile extends SyncFields {
  /** Clé fixe « me » : un seul profil par appareil. */
  id: string;
  /** Identifiant d'appareil pour l'orchestrateur. */
  deviceId: string;
  /** Nom du propriétaire de la boutique. */
  ownerName: string;
  /** Nom de la boutique. */
  storeName: string;
  phone?: string;
  location?: string;
  /** Horodatage de l'inscription, en millisecondes. Ne change jamais. */
  registrationDate: number;
  /** Échéance de la licence, en millisecondes. */
  expiryDate: number;
  /** Dernier envoi réussi vers l'orchestrateur. */
  lastSyncedAt?: number;
  /**
   * Compte marchand (v3) : un téléphone + mot de passe partages par toutes les caisses
   * du même commerçant. Saisis à l'onboarding, présentés à chaque handshake — le
   * serveur rattache l'écran au compte, ou crée le compte au premier contact.
   * Champs optionnels sans index : aucun upgrade(), les fiches existantes les lisent
   * `undefined`, exactement comme les autres champs optionnels de ce schéma.
   */
  accountName?: string;
  accountPhone?: string;
  accountPassword?: string;
  /**
   * Mot clé de récupération du compte (v3) : combinaison aléatoire des infos fournies
   * à la création, remise par le serveur UNE seule fois à l'écran créateur. Présenté
   * au handshake d'un nouvel écran pour rattacher ce compte (téléphone perdu) — ou
   * vides sur une caisse qui se connecte par téléphone+mot de passe.
   */
  accountKeyword?: string;
  /**
   * Identifiant de compte opaque, attribué par l'orchestrateur au handshake et conservé
   * tel quel. C'est la SOURCE du `shopId` dès qu'il est présent (cf. `deriveShopId`).
   *
   * Pourquoi : la dérivation locale (`SHA-256(téléphone|nom)`) est DEVINABLE — l'espace
   * des numéros et des noms de boutique est tout petit, et un `shop_id` ainsi calculé
   * s'énumère. Or le relais est aveugle et se fie au `shop_id` que le client annonce :
   * deviner le `shop_id` d'un concurrent donnait l'accès en lecture à ses ventes et en
   * écriture à sa caisse. Un identifiant non dérifiable ferme l'énumération.
   *
   * Absent tant que le serveur ne le fournit pas : la caisse retombe alors sur la
   * dérivation locale, l'état actuel. Champ optionnel, aucun `upgrade()`.
   */
  accountId?: string;
  /** Empreinte numérique de l'appareil (SHA-256) — garantit 1 téléphone = 1 boutique. */
  deviceFingerprint?: string;
}

/**
 * Clôture d'un employé IMPORTÉE par le propriétaire via le QR de restitution (restitution.ts).
 *
 * Les ventes de l'employé vivent sur SON appareil ; le QR transporte des AGRÉGATS (jamais
 * les lignes brutes). Cette entrée est la trace locale du côté propriétaire : elle cumule ce
 * que l'employé a généré et sert de protection anti-doublon (id déterministe). Local par
 * nature — comme `product_expenses`, elle ne fait pas partie du moteur de synchronisation.
 */
export interface ClosingImport extends SyncFields {
  /** Identifiant déterministe (anti-doublon) : hash du contenu + appareil employé. */
  id: string;
  /** Enseigne / nom de compte de la boutique de l'employé. */
  shopName: string;
  /** Identifiant d'appareil de la caisse EMPLOYÉ qui a vendu. */
  employeeDeviceId: string;
  /** Nom du vendeur (libellé) — absent si l'employé n'a pas de nom saisi. */
  employeeName: string;
  /** Identifiant de l'appareil PROPRIÉTAIRE qui a importé (deviceId local). */
  ownerDeviceId: string;
  /** Début de la période couverte, en ms. */
  periodFrom: number;
  /** Fin EXCLUSIVE de la période couverte, en ms. */
  periodTo: number;
  /** Nombre de ventes encaissées dans la période. */
  salesCount: number;
  /** Nombre d'articles vendus. */
  itemsCount: number;
  /** Chiffre d'affaires, en FCFA. */
  revenue: number;
  /** Bénéfice, en FCFA. */
  profit: number;
  /** Moment où le propriétaire a importé le QR. */
  importedAt: number;
  /** Répartition du revenu et du bénéfice par catégorie (libellé). */
  byCategory: { category: string; revenue: number; profit: number }[];
  /** Répartition par produit (nom, quantité, revenu, bénéfice). Optionnel — peut être
   *  vide si le QR ne le transporte pas (limite de capacité). */
  byProduct: { name: string; quantity: number; revenue: number; profit: number }[];
}
