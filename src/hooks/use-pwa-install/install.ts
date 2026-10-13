import { consume, refresh, store } from "./store";
import type { InstallOutcome } from "./types";

/**
 * Attente bornée : Chrome re-émet `beforeinstallprompt` quelques secondes APRÈS
 * le chargement (une fois manifest + service worker validés), et peut le re-émettre
 * après un refus et une nouvelle interaction. Plutôt que d'abandonner le clic sur
 * place, on attend que l'événement arrive puis on ouvre le prompt automatiquement.
 */
function waitForCaptured(): Promise<InstallOutcome> {
  const TIMEOUT_MS = 8000;
  return new Promise<InstallOutcome>((resolve) => {
    const onCaptured = () => {
      cleanup();
      if (!store.captured) {
        resolve("unavailable");
        return;
      }
      const p = consume(store.captured);
      store.pending = p.finally(() => {
        store.pending = null;
        refresh();
      });
      resolve(p);
    };
    const onTimeout = () => {
      cleanup();
      resolve("unavailable");
    };
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("pwa-install-captured", onCaptured);
    };
    const timer = setTimeout(onTimeout, TIMEOUT_MS);
    // Déjà arrivé, capté par le script inline, ou relayé par `bootstrap` ?
    if (store.captured || window.__pwaInstallEvent) {
      onCaptured();
      return;
    }
    window.addEventListener("pwa-install-captured", onCaptured);
  });
}

export async function install(): Promise<InstallOutcome> {
  // Le geste automatique vient d'ouvrir le prompt natif sur CE clic (pointerdown
  // précède toujours click) : rapporter son issue au lieu d'un faux échec.
  if (store.pending) return store.pending;
  // Événement vivant : le prompt s'ouvre immédiatement.
  if (store.captured) {
    store.autoShown = true;
    const p = consume(store.captured);
    store.pending = p.finally(() => {
      store.pending = null;
      refresh();
    });
    return p;
  }
  if (store.ios) return "ios-help";
  // Contexte non sécurisé : l'événement ne s'y produit JAMAIS — pas la peine d'attendre.
  if (store.insecure) return "unavailable";
  // L'événement n'est pas encore arrivé (ou l'a été puis consommé par un refus) : on
  // attend qu'il soit (re)émis, puis on ouvre le prompt — pas de repli précipité.
  return (store.waiting ??= waitForCaptured().finally(() => {
    store.waiting = null;
  }));
}
