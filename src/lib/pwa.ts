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

/** Événement émis quand une version de l'application est prête à être appliquée. */
export const UPDATE_EVENT = "app-update-available";

export interface UpdateAvailableDetail {
  /** Applique la mise à jour : le service worker en attente prend la main, la page se recharge. */
  apply: () => void;
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.DEV) return;
  if (!("serviceWorker" in navigator)) return;
  const register = () =>
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Un nouveau service worker a PRIS LA MAIN : les assets qu'il sert ont changé,
        // mais la page qui tourne charge encore l'ancien JavaScript — il faut la
        // recharger. Sans ce signal, un téléphone peut rester des heures sur une
        // version périmée, et RIEN ne le montre : l'app paraît vivante, elle ne
        // dialogue simplement avec personne (le canal P2P, lui, se tait).
        //
        // Le premier enregistrement ne compte PAS : il n'y avait pas de contrôleur
        // avant, donc rien n'a changé pour la page.
        let avaitControleur = Boolean(navigator.serviceWorker.controller);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!avaitControleur) {
            avaitControleur = true;
            return;
          }
          notifyUpdate(registration);
        });
        // Un service worker en attente (installé, pas encore actif) est la même
        // situation : la version suivante est prête.
        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdate(registration);
        }
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              notifyUpdate(registration);
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });
  // Sur la coquille SPA statique, `load` peut se déclencher avant que ce module
  // (monté via useEffect) s'exécute. Attendre un événement déjà passé ne déclencherait
  // jamais register, et l'application resterait sans service worker — donc sans précache.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}

/** Prévient l'interface qu'une version est prête. */
function notifyUpdate(registration: ServiceWorkerRegistration): void {
  window.dispatchEvent(
    new CustomEvent<UpdateAvailableDetail>(UPDATE_EVENT, {
      detail: { apply: () => void applyUpdate(registration) },
    }),
  );
}

/**
 * Applique la version en attente : le service worker prend la main, puis la page se
 * recharge — le rechargement est le seul moyen d'obtenir le NOUVEAU JavaScript (le
 * code déjà chargé reste l'ancien, quoi qu'il arrive).
 */
export async function applyUpdate(registration: ServiceWorkerRegistration): Promise<void> {
  const waiting = registration.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  await new Promise<void>((resolve) => {
    navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
    // Filet : si le navigateur ne signale pas le changement de contrôle, on recharge
    // quand même — le service worker actif serves alors les nouveaux assets.
    setTimeout(resolve, 2000);
  });
  window.location.reload();
}

/**
 * État PERSISTÉ réel de cet appareil, hors opinion : "persisted" (le navigateur
 * garantit le stockage), "prompt" (il peut évincer IndexedDB sous pression disque,
 * `persist()` est disponible pour accepter) ou "unsupported" (API absente, ou
 * aucune garantie demandable).
 *
 * Pourquoi une FONCTION pure et pas la logique inline du hook : la règle "onerait-on
 * de demander ?" doit être lisible, et le bandeau réel qui découvre le vrai état -
 * testé sans navigateur.
 */
export type PersistedStorageStatus = "persisted" | "prompt" | "unsupported";

export async function persistedStorageStatus(): Promise<PersistedStorageStatus> {
  if (typeof navigator === "undefined") return "unsupported";
  if (!navigator.storage?.persist) return "unsupported";
  try {
    return (await navigator.storage.persisted()) ? "persisted" : "prompt";
  } catch {
    return "unsupported";
  }
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
