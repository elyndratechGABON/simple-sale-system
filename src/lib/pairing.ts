// Appairage d'un nouvel écran au compte marchand.
//
// L'appareil principal (abonné) fabrique un payload JSON contenant les identifiants
// du compte ; le QR est scanné par la nouvelle caisse, qui les pose en base puis
// rejoint le compte à son premier handshake. Le serveur applique ensuite seul la
// règle des places : au-delà du quota du palier, l'écran est bloqué « device_limit ».
//
// Le payload contient le mot de passe du compte : il ne doit JAMAIS quitter l'écran
// du commerçant (pas d'envoi réseau, pas de partage) et n'être montré qu'au scan.
import { getShopProfile } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";

export interface PairingPayload {
  v: 1;
  app: "ecaisse";
  /** URL de l'orchestrateur — la nouvelle caisse doit parler au même serveur. */
  url: string;
  name: string;
  phone: string;
  password: string;
}

/** Fabrique le contenu du QR depuis le profil local, ou `null` sans compte marchand. */
export async function buildPairingPayload(): Promise<string | null> {
  const profile = await getShopProfile();
  if (!profile?.accountPhone || !profile.accountPassword) return null;
  const payload: PairingPayload = {
    v: 1,
    app: "ecaisse",
    url: getOrchestratorUrl() ?? "",
    name: profile.accountName ?? profile.storeName,
    phone: profile.accountPhone,
    password: profile.accountPassword,
  };
  return JSON.stringify(payload);
}

/**
 * Lit un QR scanné. Tolérant : accepte aussi un texte « téléphone motdepasse » sur
 * deux lignes pour une saisie manuelle de secours. Renvoie `null` si méconnaissable.
 */
export function parsePairingPayload(
  text: string,
): Pick<PairingPayload, "name" | "phone" | "password"> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as Partial<PairingPayload>;
      if (
        data.app === "ecaisse" &&
        typeof data.phone === "string" &&
        data.phone.trim().length > 0 &&
        typeof data.password === "string" &&
        data.password.length >= 4
      ) {
        return {
          name: typeof data.name === "string" ? data.name : "",
          phone: data.phone.trim(),
          password: data.password,
        };
      }
    } catch {
      // JSON invalide → tenter le format texte ci-dessous.
    }
  }

  const lines = trimmed.split(/\s+/).filter(Boolean);
  if (lines.length === 2 && lines[1].length >= 4) {
    return { name: "", phone: lines[0], password: lines[1] };
  }
  return null;
}
