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
