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
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.DEV) return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
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
