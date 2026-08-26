export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  // iPadOS 13+ se présente comme un Mac (user-agent desktop) mais reste tactile : sans
  // ce test, l'aide à l'installation n'apparaîtrait jamais sur iPad.
  return /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

export type InstallPlatform = "ios" | "android" | "desktop";

/**
 * Plateforme d'installation : oriente le repli quand aucun événement natif
 * n'est disponible (Safari → Partager ; Android → menu ⋮ du navigateur ;
 * desktop → icône dans la barre d'adresse).
 */
export function detectInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") return "desktop";
  if (isIOS()) return "ios";
  if (/android/i.test(navigator.userAgent)) return "android";
  return "desktop";
}

/**
 * Contexte non sécurisé (http hors localhost) : `beforeinstallprompt` n'y est
 * JAMAIS exposé — c'est la cause n°1 du « pas de bouton d'installation » lors
 * des tests en IP locale. Le repli doit le dire explicitement au lieu d'un
 * message générique.
 */
export function isInsecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === false;
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.DEV) return;
  if (!("serviceWorker" in navigator)) return;
  const register = () =>
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  // Sur la coquille SPA statique, `load` peut se déclencher avant que ce module
  // (monté via useEffect) s'exécute. Attendre un événement déjà passé ne déclencherait
  // jamais register, et l'application resterait sans service worker — donc sans précache.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!navigator.storage?.persist) return false;
  try {
    const granted = await navigator.storage.persist();
    if (!granted) {
      const estimate = await navigator.storage.estimate().catch(() => null);
      if (estimate) console.info("IndexedDB storage usage", estimate);
    }
    return granted;
  } catch (error) {
    console.error("Storage persistence request failed", error);
    return false;
  }
}

// ── Push notifications ────────────────────────────────────────────────────────
// VAPID keys et endpoint pour les notifications push.
// En production, ces valeurs viendraient du serveur orchestrator.
const VAPID_PUBLIC_KEY = "";
const PUSH_ENDPOINT = "";

/**
 * Demande la permission et s'abonne aux notifications push.
 * Retourne la subscription ou null si le navigateur ne supporte pas les push
 * ou si l'utilisateur refuse.
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (!VAPID_PUBLIC_KEY || !PUSH_ENDPOINT) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Envoyer la subscription au serveur
    await fetch(PUSH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    return subscription;
  } catch (error) {
    console.error("Push subscription failed", error);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a une subscription push active.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Désabonne des notifications push.
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error("Push unsubscribe failed", error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
