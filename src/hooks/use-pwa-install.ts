// État d'installabilité de la PWA — STORE PARTAGÉ entre tous les composants.
//
// Pourquoi un singleton et pas un état par hook : la landing affiche TROIS
// « Installer » (header compact, hero, section finale), chaque <InstallCta>
// montait son propre usePwaInstall. L'événement `beforeinstallprompt` n'est
// consommable qu'UNE fois : au premier geste, chaque instance appelait
// prompt() sur le même objet — une réussissait (la première montée, donc le
// header), les autres étaient rejetées par Chrome → « unavailable » → le
// bouton du hero ouvrait invariablement le message de repli. Désormais un
// seul état vit au niveau du module : un seul écouteur de geste, une seule
// consommation, tous les boutons reflètent la même réalité.
//
// Rien n'est évalué pendant le rendu serveur : le bootstrap touche window
// uniquement côté navigateur, et le snapshot serveur est une constante.
import { useCallback, useSyncExternalStore } from "react";
import { type BeforeInstallPromptEvent, isIOS, isStandalone } from "@/lib/pwa";

declare global {
  interface Window {
    /** Événement capturé par le script inline de `__root.tsx`, avant le montage React. */
    __pwaInstallEvent?: BeforeInstallPromptEvent;
    /** Marqueur de test : l'écouteur inline de capture est posé. */
    __pwaInstallCaptureArmed?: boolean;
  }
}

/** Résultat d'une tentative d'installation. `ios-help` = à l'appelant d'afficher la marche à suivre. */
export type InstallOutcome = "accepted" | "dismissed" | "ios-help" | "unavailable";

export interface PwaInstallState {
  /** Un chemin d'installation existe sur cette plateforme. */
  canInstall: boolean;
  /** L'application tourne déjà installée, ou vient de l'être. */
  installed: boolean;
  /** Safari n'expose aucun prompt : l'installation passe par une manipulation manuelle. */
  isIos: boolean;
  install: () => Promise<InstallOutcome>;
}

interface Snapshot {
  prompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  isIos: boolean;
}

/* ── Store de module ─────────────────────────────────────────────────────── */

const SERVER_SNAPSHOT: Snapshot = { prompt: null, installed: false, isIos: false };

let captured: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
let iosFlag = false;
let autoShown = false;
let autoArmed = false;
let pending: Promise<InstallOutcome> | null = null;

let snap: Snapshot = SERVER_SNAPSHOT;
const subscribers = new Set<() => void>();

function refresh() {
  snap = { prompt: captured, installed: installedFlag, isIos: iosFlag };
  subscribers.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

function getSnapshot(): Snapshot {
  return snap;
}

/** Consomme UN événement : prompt() n'est appelable qu'une fois — tout second
 *  appel est rejeté par Chrome, d'où la normalisation systématique du résultat. */
function consume(e: BeforeInstallPromptEvent): Promise<InstallOutcome> {
  if (window.__pwaInstallEvent === e) window.__pwaInstallEvent = undefined;
  return e
    .prompt()
    .then(() => e.userChoice)
    .then((choice) => {
      if (choice.outcome === "accepted") installedFlag = true;
      return choice.outcome as InstallOutcome;
    })
    .catch(() => "unavailable" as InstallOutcome)
    .finally(() => {
      // L'événement est dépensé quoi qu'il arrive : plus aucun bouton ne doit
      // retenter prompt() dessus.
      if (captured === e) captured = null;
      refresh();
    });
}

/** Un seul écouteur de geste pour toute la page : le premier tap/clic ouvre le
 *  dialogue natif. Les clics sur un bouton « Installer » pendant que ce prompt
 *  est ouvert récupèrent SA promesse (`pending`) plutôt qu'un faux échec. */
function armAutoGesture() {
  if (autoArmed || !captured || installedFlag || iosFlag || autoShown) return;
  autoArmed = true;
  const onGesture = () => {
    autoArmed = false;
    autoShown = true;
    const e = captured;
    if (!e) return;
    pending = consume(e).finally(() => {
      pending = null;
      refresh();
    });
  };
  document.addEventListener("pointerdown", onGesture, { once: true, capture: true });
}

function bootstrap() {
  iosFlag = isIOS();

  if (isStandalone()) {
    installedFlag = true;
  }

  const onPrompt = (e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    captured = e;
    refresh();
    armAutoGesture();
  };

  const onInstalled = () => {
    window.__pwaInstallEvent = undefined;
    captured = null;
    installedFlag = true;
    refresh();
  };

  // L'événement a très probablement déjà EU LIEU avant ce module (Chrome le tire
  // dès sa vérification manifest+SW). Le script inline de `__root.tsx` l'a mis
  // de côté : on le récupère ici, puis on arme le geste partagé.
  const early = window.__pwaInstallEvent;
  if (early) captured = early;

  window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
  window.addEventListener("appinstalled", onInstalled);
  window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
    if (e.matches) installedFlag = true;
    refresh();
  });

  refresh();
  armAutoGesture();
}

if (typeof window !== "undefined") {
  bootstrap();
}

/* ── API publique ────────────────────────────────────────────────────────── */

async function install(): Promise<InstallOutcome> {
  // Le geste automatique vient d'ouvrir le prompt natif sur CE clic (pointerdown
  // précède toujours click) : rapporter son issue au lieu d'un faux échec.
  if (pending) return pending;
  if (captured && !autoShown) {
    autoShown = true;
    const p = consume(captured);
    pending = p.finally(() => {
      pending = null;
      refresh();
    });
    return p;
  }
  if (iosFlag) return "ios-help";
  return "unavailable";
}

/**
 * Hook public — instancié autant de fois qu'il y a de boutons « Installer »,
 * il lit TOUS le même état partagé : premier arrivé ou non, chaque bouton se
 * comporte à l'identique.
 */
export function usePwaInstall(): PwaInstallState {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  const installStable = useCallback(() => install(), []);

  return {
    canInstall: state.prompt !== null || state.isIos,
    installed: state.installed,
    isIos: state.isIos,
    install: installStable,
  };
}
