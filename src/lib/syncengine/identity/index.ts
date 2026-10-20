// Identité d'appareil du moteur de synchronisation P2P.
//
// Chaque appareil possède :
//  - un `deviceId` unique, généré une fois, stable — il identifie le MOBILE, pas le compte ;
//  - une paire de clés WebCrypto (ECDSA P-256) servant à SIGNER ses opérations ; la
//    privée ne quitte JAMAIS l'appareil. C'est la preuve d'origine d'une op : le relais
//    est aveugle et `shop_id` vient du client, donc rien d'autre ne dit qu'une op vient
//    d'un appareil du groupe (cf. `signOp` / `verifyOpSignature`, et `isTrustedOp` côté
//    application qui refuse tout ce qui ne se vérifie pas) ;
//  - un `shopId` : le groupe de partage. Deux appareils du même `shopId` se synchronisent.
//
// Le `shopId` descend du compte marchand (`ShopProfile.accountPhone` + `accountName`) :
// deux caisses du même commerçant partagent le même groupe, et deux commerces différents
// ne peuvent pas se croiser. Sans compte (caisse jamais inscrite), l'appareil vit dans un
// groupe isolé `d_<device>` — il n'a encore rien à partager.
//
// Persistance : store `settings` (IndexedDB), pas localStorage. L'identité est de la donnée
// d'appareil : elle doit survivre au rechargement, être exclue des sauvegardes comme le
// dossier de documents, et être remise à zéro par `purgeAllData`/`resetDeviceIdentity`.
// Une fois chargée, elle est mise en cache pour que l'émission d'opérations — qui se fait
// DANS une transaction Dexie — reste synchrone après le premier chargement.
//
// (state.ts) cache partagé et accès ; (crypto.ts) signature des ops ; (shop-id.ts) dérivation
// et adoption du groupe ; (load.ts) chargement/écriture de l'identité.
export {
  getDeviceKeys,
  getCachedIdentity,
  getIdentity,
  isSharedGroup,
  resetIdentityForTests,
} from "./state";
export { signableBody, signOp, verifyOpSignature } from "./crypto";
export { adoptShopIdFromRelay, clearAdoptedShopId, refreshShopId } from "./shop-id";
export {
  ensureIdentity,
  resetDeviceIdentity,
  setIdentityEmployeeName,
  setIdentityEmployeePhone,
  setIdentityRole,
} from "./load";
