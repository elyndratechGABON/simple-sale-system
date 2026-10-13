import { getShopProfile } from "@/lib/db";
import { getPreferences } from "@/lib/settings";
import { getOrchestratorUrl } from "@/lib/sync";
import { getPairingToken } from "@/lib/syncengine/pairing";
import type { DeviceRole } from "@/lib/syncengine/types";
import type { PairingPayload, PairingShopInfo, SharePayload } from "./types";

/** Fabrique le contenu du QR depuis le profil local, ou `null` sans compte marchand.
 *  @param role  Rôle assigné au futur appareil (optionnel — absent = ancien comportement). */
export async function buildPairingPayload(role?: DeviceRole): Promise<string | null> {
  const profile = await getShopProfile();
  if (!profile?.accountPhone || !profile.accountPassword) return null;
  const prefs = getPreferences();
  const pairCode = await getPairingToken();
  const payload: PairingPayload = {
    v: 1,
    app: "ecaisse",
    url: getOrchestratorUrl() ?? "",
    name: profile.accountName ?? profile.storeName,
    phone: profile.accountPhone,
    password: profile.accountPassword,
    ...(pairCode ? { pair_code: pairCode } : {}),
    ...(role && role !== "owner" ? { role } : {}),
    shop: {
      storeName: prefs.workspaceName || profile.storeName,
      ownerName: profile.ownerName || prefs.ownerName,
      phone: profile.phone || prefs.phone,
      quarter: profile.location || prefs.quarter,
      cluster: prefs.cluster,
      customDomain: prefs.customDomain,
      customUnitType: prefs.customUnitType,
      tablesEnabled: prefs.tablesEnabled,
    },
  };
  return JSON.stringify(payload);
}

/**
 * Lit un QR scanné. Tolérant : accepte aussi un texte « téléphone motdepasse » sur
 * deux lignes pour une saisie manuelle de secours. Renvoie `null` si méconnaissable.
 */
export function parsePairingPayload(text: string): PairingShopInfo | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as Partial<PairingPayload | SharePayload>;
      if (
        data.app === "ecaisse" &&
        (data as Partial<PairingPayload>).phone !== undefined &&
        typeof (data as Partial<PairingPayload>).password === "string" &&
        (data as Partial<PairingPayload>).password!.length >= 4
      ) {
        const d = data as Partial<PairingPayload>;
        const shop = d.shop;
        const rawRole = d.role as string | undefined;
        const shopInfo: PairingShopInfo = {
          name: typeof d.name === "string" ? d.name : "",
          phone: (d.phone ?? "").trim(),
          password: d.password ?? "",
          pair_code: typeof d.pair_code === "string" ? d.pair_code.trim() : undefined,
          role:
            rawRole === "employee" || rawRole === "manager" || rawRole === "owner"
              ? rawRole === "owner"
                ? "owner"
                : "employee"
              : undefined,
        };
        if (shop && typeof shop === "object") {
          shopInfo.shop = shop;
        }
        return shopInfo;
      }
      // Jeton de partage (v2) — pas de mot de passe, token opaque + code de paire
      if (
        data.app === "ecaisse" &&
        typeof (data as SharePayload).token === "string" &&
        (data as SharePayload).token.length > 8 &&
        typeof (data as SharePayload).pair_code === "string" &&
        (data as SharePayload).pair_code.length === 6
      ) {
        const s = data as SharePayload;
        return {
          name: typeof s.name === "string" ? s.name : "",
          phone: s.account_phone ?? "",
          password: "", // aucun mot de passe — le handshake passera par lien/bénédiction
          pair_code: s.pair_code.trim(),
          role:
            s.role === "employee" || s.role === "owner"
              ? s.role === "owner"
                ? "owner"
                : "employee"
              : undefined,
          shop: s.shop,
          token: s.token,
        } as PairingShopInfo;
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
