import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { acquireWebStream, toCameraError } from "./internal";

export interface CameraAccess {
  available: boolean;
  denied: boolean;
  platform: "native" | "web";
  /** Instruction précise à afficher quand l'accès est impossible. */
  fix: string | null;
}

/**
 * Déclenche la demande d'activation de la caméra, quel que soit le support.
 * À appeler DEPUIS un geste utilisateur (clic) : c'est cette fenêtre d'activation
 * qui autorise le prompt `getUserMedia` sur mobile.
 */
export async function requestCameraActivation(): Promise<CameraAccess> {
  // Pré-vol : sans contexte sécurisé, aucun navigateur n'expose la caméra.
  const insecure =
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !navigator.mediaDevices?.getUserMedia;
  if (insecure) {
    const onHttp =
      typeof location !== "undefined" && location.protocol === "http:" && !!location.host;
    return {
      available: false,
      denied: true,
      platform: "web",
      fix: onHttp
        ? `La caméra ne peut pas se lancer depuis « ${location.host} » (adresse http). Ouvrez l'application via son adresse https://, ou installez-la, puis réessayez.`
        : "La caméra exige une connexion sécurisée : ouvrez l'application en HTTPS (ou via l'application installée), puis réessayez.",
    };
  }

  // Native (Capacitor) : le dialogue système s'ouvre à la demande.
  if (Capacitor.isNativePlatform()) {
    const status = await Camera.checkPermissions();
    if (status.camera === "granted")
      return { available: true, denied: false, platform: "native", fix: null };
    const result = await Camera.requestPermissions();
    if (result.camera === "granted")
      return { available: true, denied: false, platform: "native", fix: null };
    return {
      available: false,
      denied: true,
      platform: "native",
      fix:
        result.camera === "denied"
          ? "Autorisation caméra refusée. Ouvrez Réglages → Applications → Caisse → Autorisations, activez la caméra, puis touchez Réessayer."
          : "La caméra n'est pas utilisable sur cet appareil. Vérifiez ses réglages système, puis touchez Réessayer.",
    };
  }

  // Web (iOS surtout) : le prompt `getUserMedia` ne naît que s'il est retenu DANS la
  // fenêtre d'activation du geste. Tout `await` avant lui (import encore en cours de
  // cache, autre micro-tâche) suffit à l'écraser : au 1er essai à froid, iOS ne montre
  // aucun prompt et échoue en silence. On ouvre donc réellement la caméra ICI, dans le
  // geste, puis on relâche le flux — la permission est acquise et le `scanner.start()`
  // suivant (html5-qrcode fait son propre getUserMedia) obtient le flux sans prompt.
  try {
    await acquireWebStream();
    return { available: true, denied: false, platform: "web", fix: null };
  } catch (err) {
    const classified = toCameraError(err);
    const name = String((err as { name?: string })?.name ?? "");
    const denied =
      /notallowed|permission|denied|security/i.test(name) ||
      /permission|denied|refus/i.test(classified.message);
    return { available: false, denied, platform: "web", fix: classified.message };
  }
}
