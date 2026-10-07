// Empreinte numérique de l'appareil (Phase 2 — 1 téléphone = 1 boutique).
//
// SHA-256 d'un assemblage de signaux MATÉRIELS. La règle sert à empêcher un même
// téléphone d'ouvrir plusieurs boutiques (donc plusieurs abonnements) : elle doit donc
// distinguer deux appareils réels, pas deux fenêtres de navigateur.
//
// ⚠️ Ce qu'elle ne garantit PAS : être stable d'un navigateur à l'autre. Le user-agent
// fait déjà partie des signaux, donc Safari et Chrome sur le même téléphone n'ont jamais
// produit la même empreinte. Un contournement reste possible en changeant de navigateur —
// c'est un garde-fou, pas un cadenas.
//
// Pourquoi des signauxsupplementary : l'user-agent d'Android Chrome est RÉDUIT
// (« Linux; Android 10; K ») — il ne dit plus le modèle. Deux téléphones de gamme
// courant partageant la même version de Chrome, la même résolution en CSS pixels, le même
// fuseau et le même nombre de cœurs produisaient donc le MÊME hash : le second client se
// faisait refuser à l'inscription (409 fingerprint_conflict) et sa boutique n'apparaissait
// jamais. Les client hints (modèle réel), la mémoire et le nombre de points de contact
// distinguent ces appareils.
const FINGERPRINT_KEY = "pos_device_fingerprint";

/** Signaux d'un appareil. Volontairement plats et tous optionnels : un navigateur qui ne
 *  sait rien rendre une chaîne vide, jamais `undefined`. */
export interface FingerprintSignals {
  userAgent: string;
  platform: string;
  screen: string;
  timeZone: string;
  cores: string;
  language: string;
  pixelRatio: string;
  touchPoints: string;
  deviceMemory: string;
  /** `platform|model|platformVersion` des client hints, ou "" si l'API est absente. */
  clientHints: string;
}

const str = (v: unknown): string =>
  v === undefined || v === null ? "" : String(v);

/** Ce qui est réellement haché. La version `v2` est dans la chaîne : un changement
 *  d'algorithme rend les anciennes empreintes intentionally méconnaissables (elles ne
 *  servent qu'à comparer deux appareils entre eux, jamais à réidentifier un appareil). */
export function fingerprintInput(s: FingerprintSignals): string {
  return [
    "v2",
    s.userAgent,
    s.platform,
    s.screen,
    s.timeZone,
    s.cores,
    s.language,
    s.pixelRatio,
    s.touchPoints,
    s.deviceMemory,
    s.clientHints,
  ]
    .map(str)
    .join("|||");
}

/** Client hints à haute entropie : le seul endroit où le vrai modèle de l'appareil est
 *  lisible. Absent sur Safari/Firefox — on rend alors une chaîne vide, les autres signaux
 *  suffisent à faire la différence. */
async function readClientHints(): Promise<string> {
  const uaData = (navigator as Navigator & {
    userAgentData?: {
      getHighEntropyValues?: (hints: string[]) => Promise<{ platform?: string; model?: string; platformVersion?: string }>;
    };
  }).userAgentData;
  if (typeof uaData?.getHighEntropyValues !== "function") return "";
  try {
    const v = await uaData.getHighEntropyValues(["platform", "model", "platformVersion"]);
    return `${str(v.platform)}|${str(v.model)}|${str(v.platformVersion)}`;
  } catch {
    // Permission refusée ou indice inconnu : on continue sans, l'empreinte reste
    // calculable (et reste stable pour cet appareil).
    return "";
  }
}

/**
 * Génère ou récupère l'empreinte numérique de l'appareil.
 * La valeur est persistée dans localStorage pour éviter de régénérer à chaque chargement.
 * Si le Web Crypto API n'est pas disponible (mode privé strict sur certains navigateurs),
 * renvoie null — le serveur accepte les handshakes sans fingerprint (rétrocompat).
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Vérifier le cache local.
  try {
    const cached = window.localStorage.getItem(FINGERPRINT_KEY);
    if (cached) return cached;
  } catch {
    // localStorage inaccessible (mode privé strict) : on régénère à chaque fois.
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const raw = fingerprintInput({
    userAgent: nav.userAgent ?? "",
    platform: nav.platform ?? "",
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    cores: str(nav.hardwareConcurrency),
    language: nav.language ?? "",
    pixelRatio: str(typeof window === "undefined" ? 1 : window.devicePixelRatio ?? 1),
    touchPoints: str(nav.maxTouchPoints),
    deviceMemory: str(nav.deviceMemory),
    clientHints: await readClientHints(),
  });

  // SHA-256 via Web Crypto API (disponible dans tous les navigateurs modernes).
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Persister pour les prochains chargements.
    try {
      window.localStorage.setItem(FINGERPRINT_KEY, hashHex);
    } catch {
      // Quota plein : pas grave, on régénérera au prochain chargement.
    }

    return hashHex;
  } catch {
    // Web Crypto indisponible : fallback simple (non-cryptographique).
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    const fallback = `fb${Math.abs(hash).toString(16).padStart(8, "0")}`;
    try {
      window.localStorage.setItem(FINGERPRINT_KEY, fallback);
    } catch {
      // Ignoré.
    }
    return fallback;
  }
}
