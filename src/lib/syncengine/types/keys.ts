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
