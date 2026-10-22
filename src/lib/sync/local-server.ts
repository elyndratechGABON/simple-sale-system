// L'ORCHESTRATEUR LOCAL — l'instance que le commerçant allume chez lui.
//
// Le cloud a une adresse FIGÉE à la compilation (`VITE_ORCHESTRATOR_URL`). Mais
// l'instance locale, elle, est sur le réseau du commerce : son adresse change
// (192.168.1.42 un jour, 192.168.1.7 le lendemain) et elle n'est allumée que par
// intermittence. On ne peut donc pas la compiler dans l'application.
//
// D'où une adresse RUNTIME, saisie dans les paramètres et mémorisée sur l'appareil.
//
// ⚠️ Elle ne sert qu'à la RESTAURATION. Le handshake, la synchronisation et le
// canal P2P continuent de viser le cloud : le local est une copie de secours, pas
// un orchestrateur de substitution. Le changer ne doit donc jamais faire tomber la
// caisse — c'est pourquoi le flux de restauration retombe sur le cloud quand le
// local ne répond pas.

const KEY = "pos_local_orchestrator_url";

/** Adresse de l'instance locale, ou "" si le commerçant n'en a pas configuré. */
export function getLocalOrchestratorUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const brut = window.localStorage.getItem(KEY) ?? "";
    return brut.trim().replace(/\/+$/, "");
  } catch {
    // Stockage inaccessible (mode privé strict) : pas d'instance locale, sans
    // casser l'application.
    return "";
  }
}

/**
 * Mémorise l'adresse de l'instance locale.
 *
 * `null` DÉSACTIVE l'instance locale (le cloud reprend la main). Une chaîne VIDE
 * ne fait rien : c'est le cas d'un champ laissé vide par erreur au moment
 * d'enregistrer — l'adresse déjà mémorisée doit survivre.
 */
export function setLocalOrchestratorUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (url === null) {
      window.localStorage.removeItem(KEY);
      return;
    }
    const propre = url.trim().replace(/\/+$/, "");
    if (propre) window.localStorage.setItem(KEY, propre);
  } catch {
    // Idem : la preference ne survivra pas au rechargement, l'application reste
    // utilisable pour cette session.
  }
}
