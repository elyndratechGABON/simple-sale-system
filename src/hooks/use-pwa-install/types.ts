import type { BeforeInstallPromptEvent, InstallPlatform } from "@/lib/pwa";

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
  /** Plateforme détectée : oriente le repli (menu Android, barre d'adresse desktop…). */
  platform: InstallPlatform;
  /** Contexte non sécurisé (http hors localhost) : cause n°1 d'absence du prompt natif. */
  insecure: boolean;
  install: () => Promise<InstallOutcome>;
}

export interface Snapshot {
  prompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  isIos: boolean;
  platform: InstallPlatform;
  insecure: boolean;
}

export const SERVER_SNAPSHOT: Snapshot = {
  prompt: null,
  installed: false,
  isIos: false,
  platform: "desktop",
  insecure: false,
};
