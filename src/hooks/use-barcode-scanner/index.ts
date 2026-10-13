// Scanner de code-barres / QR cross-platform, avec APERÇU VISIBLE.
//
// - Web : `Html5Qrcode` de `html5-qrcode` (import dynamique), rendu dans une
//   superposition plein écran avec boutons Annuler / Réessayer.
// - Capacitor : même librairie dans le WebView — qui exige la permission native
//   CAMERA (demandée par `Camera.requestPermissions()`), sinon getUserMedia ne
//   répond jamais et le cadre reste noir.
//
// « Peu importe le mobile » : chaque clic de retry relance `requestCameraActivation()`
// sur un geste utilisateur frais — le prompt natif Android/iOS re-s'ouvre, et le web
// re-sonde navigator.permissions. Un refus persistant ne peut être levé que par l'UI
// du navigateur (icône en barre d'adresse) ou les réglages système : l'erreur affichée
// l'explique exactement, puis on peut réessayer sans quitter l'écran.
//
// Deux garanties supplémentaires :
//  - la PREMIÈRE activation part dans le geste de clic lui-même, avant tout await
//    (l'import dynamique et le démarrage du flux attendent derrière) — le prompt natif
//    n'est plus décalé d'un tick ;
//  - si le composant qui héberge le scan est démonté en pleine passe (navigation),
//    `activeStop` arrête le flux, retire la superposition et fait résoudre `null` :
//    jamais d'overlay orphelin ni de `scanning` bloqué.
//
// (internal.ts) utilitaires partagés ; (camera-activation.ts) demande de permission ;
// (overlay.ts) la superposition ; (scanner-overlay.ts) la passe de scan complète.
export { useBarcodeScanner } from "./useBarcodeScanner";
export { requestCameraActivation } from "./camera-activation";
export type { CameraAccess } from "./camera-activation";
