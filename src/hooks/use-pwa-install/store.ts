import {
  type BeforeInstallPromptEvent,
  detectInstallPlatform,
  isIOS,
  isInsecureContext,
  isStandalone,
  type InstallPlatform,
} from "@/lib/pwa";
import { SERVER_SNAPSHOT, type InstallOutcome, type Snapshot } from "./types";

// Store PARTAGÉ au niveau du module. Pourquoi un singleton et pas un état par hook :
// la landing affiche TROIS « Installer » (header compact, hero, section finale), chaque
// <InstallCta> montait son propre usePwaInstall. L'événement `beforeinstallprompt` n'est
// consommable qu'UNE fois : au premier geste, chaque instance appelait prompt() sur le
// même objet — une réussissait, les autres étaient rejetées par Chrome → « unavailable ».
// Désormais un seul état vit ici : un seul écouteur de geste, une seule consommation.
//
// Rien n'est évalué pendant le rendu serveur : le bootstrap touche window uniquement
// côté navigateur, et le snapshot serveur est une constante.
interface Store {
  captured: BeforeInstallPromptEvent | null;
  installed: boolean;
  ios: boolean;
  platform: InstallPlatform;
  insecure: boolean;
  autoShown: boolean;
  autoArmed: boolean;
  pending: Promise<InstallOutcome> | null;
  /** Attente bornée d'un (re)envoi de `beforeinstallprompt` (cf. `waitForCaptured`). */
  waiting: Promise<InstallOutcome> | null;
}

export const store: Store = {
  captured: null,
  installed: false,
  ios: false,
  platform: "desktop",
  insecure: false,
  autoShown: false,
  autoArmed: false,
  pending: null,
  waiting: null,
};

let snap: Snapshot = SERVER_SNAPSHOT;
const subscribers = new Set<() => void>();

export function refresh() {
  snap = {
    prompt: store.captured,
    installed: store.installed,
    isIos: store.ios,
    platform: store.platform,
    insecure: store.insecure,
  };
  subscribers.forEach((notify) => notify());
}

export function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

export function getSnapshot(): Snapshot {
  return snap;
}

/** Consomme UN événement : prompt() n'est appelable qu'une fois — tout second
 *  appel est rejeté par Chrome, d'où la normalisation systématique du résultat. */
export function consume(e: BeforeInstallPromptEvent): Promise<InstallOutcome> {
  if (window.__pwaInstallEvent === e) window.__pwaInstallEvent = undefined;
  return e
    .prompt()
    .then(() => e.userChoice)
    .then((choice) => {
      if (choice.outcome === "accepted") store.installed = true;
      return choice.outcome as InstallOutcome;
    })
    .catch(() => "unavailable" as InstallOutcome)
    .finally(() => {
      // L'événement est dépensé quoi qu'il arrive : plus aucun bouton ne doit
      // retenter prompt() dessus.
      if (store.captured === e) store.captured = null;
      refresh();
    });
}

/** Un seul écouteur de geste pour toute la page : le premier tap/clic ouvre le
 *  dialogue natif. Les clics sur un bouton « Installer » pendant que ce prompt
 *  est ouvert récupèrent SA promesse (`pending`) plutôt qu'un faux échec. */
function armAutoGesture() {
  if (store.autoArmed || !store.captured || store.installed || store.ios || store.autoShown)
    return;
  store.autoArmed = true;
  const onGesture = () => {
    store.autoArmed = false;
    store.autoShown = true;
    const e = store.captured;
    if (!e) return;
    store.pending = consume(e).finally(() => {
      store.pending = null;
      refresh();
    });
  };
  document.addEventListener("pointerdown", onGesture, { once: true, capture: true });
}

function bootstrap() {
  store.ios = isIOS();
  store.platform = detectInstallPlatform();
  store.insecure = isInsecureContext();

  if (isStandalone()) {
    store.installed = true;
  }

  const onPrompt = (e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    store.captured = e;
    refresh();
    // Même signal que le script inline de `__root.tsx` : les abonnés (dont
    // `waitForCaptured`) apprennent qu'un événement vient d'arriver.
    window.dispatchEvent(new Event("pwa-install-captured"));
    armAutoGesture();
  };

  const onInstalled = () => {
    window.__pwaInstallEvent = undefined;
    store.captured = null;
    store.installed = true;
    refresh();
  };

  // L'événement a très probablement déjà EU LIEU avant ce module (Chrome le tire
  // dès sa vérification manifest+SW). Le script inline de `__root.tsx` l'a mis
  // de côté : on le récupère ici, puis on arme le geste partagé.
  const early = window.__pwaInstallEvent;
  if (early) store.captured = early;

  window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
  window.addEventListener("appinstalled", onInstalled);
  window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
    if (e.matches) store.installed = true;
    refresh();
  });

  refresh();
  armAutoGesture();
}

if (typeof window !== "undefined") {
  bootstrap();
}
