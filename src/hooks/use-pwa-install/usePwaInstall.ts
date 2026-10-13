import { useCallback, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./store";
import { SERVER_SNAPSHOT, type PwaInstallState } from "./types";
import { install } from "./install";

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
    platform: state.platform,
    insecure: state.insecure,
    install: installStable,
  };
}
