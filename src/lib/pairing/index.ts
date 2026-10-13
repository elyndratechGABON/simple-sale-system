// Appairage d'un nouvel écran au compte marchand.
//
// L'appareil principal (abonné) fabrique un payload JSON contenant les identifiants
// du compte ; le QR est scanné par la nouvelle caisse, qui les pose en base puis
// rejoint le compte à son premier handshake. Le serveur applique ensuite seul la
// règle des places : au-delà du quota du palier, l'écran est bloqué « device_limit ».
//
// Le payload contient le mot de passe du compte : il ne doit JAMAIS quitter l'écran
// du commerçant (pas d'envoi réseau, pas de partage) et n'être montré qu'au scan.
//
// Un écran qui a rejoint le compte PAR MOT CLÉ (téléphone perdu) n'a ni téléphone ni
// mot de passe : `buildPairingPayload` renvoie `null` et le bouton « Ajouter un
// appareil » reste inactif — le QR transporte ces deux identifiants, que cet écran ne
// détient pas. Ses caisses supplémentaires rejoignent par le mot clé (saisie manuelle),
// jamais par QR : c'est voulu et géré côté UI (DevicePairingDialog).
//
// (types.ts) formes des payloads ; (build.ts) fabrication et lecture du QR ;
// (apply.ts) redemption du jeton et application de la boutique.
export { applyPairingShop, redeemShareToken } from "./apply";
export { buildPairingPayload, parsePairingPayload } from "./build";
export type { PairingPayload, PairingShopConfig, PairingShopInfo, SharePayload } from "./types";
