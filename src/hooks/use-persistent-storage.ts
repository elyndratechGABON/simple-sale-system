import { useEffect, useState } from "react";
import { persistedStorageStatus, requestPersistentStorage } from "@/lib/pwa";

export type PersistStatus = "loading" | "persisted" | "prompt" | "unsupported";

export interface PersistentStorageState {
  /** "persisted" : rien à demander. "prompt" : le stockage peut être évicté. */
  status: PersistStatus;
  /** L'appel Storage.persist(), renvoyant l'accord réel du navigateur. */
  grant: () => Promise<boolean>;
}

/**
 * État du stockage persistant de CET appareil (Storage API, pas une opinion).
 *
 * Pourquoi un hook (et pas un chantier muet dans PwaBootstrap) : le `persist()`
 * silencieux au démarrage est REFUSÉ sans op si le navigateur n'est pas convaincu
 * (navigateur par défaut, site pas installé…). L'écran doit alors LE DIRE —
 * un bandeau explicatif que l'utilisateur actionne : le geste accorde souvent
 * là où le chantier automatique échouait.
 *
 * Lecture simple et one-shot : aucun état exogène ne peut rendre persistant ce
 * qui ne l'était pas à l'ouverture (c'est une décision de session du navigateur).
 */
export function usePersistentStorage(): PersistentStorageState {
  const [status, setStatus] = useState<PersistStatus>("loading");

  useEffect(() => {
    let alive = true;
    void persistedStorageStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Plus réactif : le bandeau se retire immédiatement sur un accord. */
  async function grant(): Promise<boolean> {
    const granted = await requestPersistentStorage();
    if (granted) setStatus("persisted");
    return granted;
  }

  return { status, grant };
}
