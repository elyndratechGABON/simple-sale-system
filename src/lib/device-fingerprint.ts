// Empreinte numérique de l'appareil (Phase 2 — 1 téléphone = 1 boutique).
//
// SHA-256 de (user-agent + screen dimensions + timezone + hardwareConcurrency + langue).
// L'empreinte est stable sur un même appareil physique même si l'utilisateur change de
// navigateur (les composants matériels et le système d'exploitation restent identiques).
// Elle est envoyée au serveur à chaque handshake pour garantir l'unicité : un même
// appareil physique ne peut créer qu'une seule boutique, quel que soit le device_id.

const FINGERPRINT_KEY = "pos_device_fingerprint";

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

  // Collecte des signaux de l'appareil.
  const signals = [
    navigator.userAgent ?? "",
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(navigator.hardwareConcurrency ?? ""),
    navigator.language ?? "",
    // Ajout du ratio pixel pour distinguer les appareils avec la même résolution.
    String(window.devicePixelRatio ?? 1),
  ];

  const raw = signals.join("|||");

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
