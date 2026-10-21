// Appairage entre appareils du même compte — le « code de paire » coopératif.
//
// Le QR téléphone+mot de passe (src/lib/pairing.ts) rattache un écran au COMPTE côté
// orchestrateur. Le code de paire, lui, fait se RENCONTRER les appareils sur le canal
// d'ops P2P : il n'ouvre pas de session serveur, il prouve l'intention. Un employé
// tape le code affiché par le principal → son appareil émet `device.announce` (nom,
// rôle, clé publique, code). Le principal applique l'annonce et vérifie le code
// LOCALEMENT (celui qu'il a généré, jamais envoyé) ; s'il correspond, le pair est
// `paired` d'office. Sinon le pair reste `pending` et le principal peut approuver à
// la main (`device.approve`).
//
// Le code a une durée de vie courte (10 min) : la preuve s'use, pas le pairing.
// Un appareil se présente au groupe UNE SEULE fois (drapeau `announced`) : rejouer
// l'onboarding (re-saisir un code) ne re-émet donc pas d'op.
export { ROLE_LABELS, getIdentityRole, isOwnerIdentity } from "./roles";
export {
  generatePairingCode,
  sessionCode,
  getPairingToken,
  pairCodeExpiry,
  clearPairingCode,
  enterPairingCode,
  normPairCode,
} from "./code";
export { announceDevice, reannounceProfile, approveDevice } from "./announce";
export { departFromGroup, emitLeaveOp, finalizeLeave, leaveShop } from "./leave";
