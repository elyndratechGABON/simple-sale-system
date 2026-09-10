// Appairage d'un nouvel écran au compte marchand.
//
// L'appareil principal (abonné) fabrique un payload JSON contenant les identifiants
// du compte ; le QR est scanné par la nouvelle caisse, qui les pose en base puis
// rejoint le compte à son premier handshake. Le serveur applique ensuite seul la
// règle des places : au-delà du quota du palier, l'écran est bloqué « device_limit ».
//
// Le payload contient le mot de passe du compte : il ne doit JAMAIS quitter l'écran
// du commerçant (pas d'envoi réseau, pas de partage) et n'être montré qu'au scan.
//
// Un écran qui a rejoint le compte PAR MOT CLÉ (téléphone perdu) n'a ni téléphone ni
// mot de passe : `buildPairingPayload` renvoie `null` et le bouton « Ajouter un
// appareil » reste inactif — le QR transporte ces deux identifiants, que cet écran ne
// détient pas. Ses caisses supplémentaires rejoignent par le mot clé (saisie manuelle),
// jamais par QR : c'est voulu et géré côté UI (DevicePairingDialog).
import { getShopProfile, saveShopProfile } from "@/lib/db";
import { getOrchestratorUrl, getOpsRelayUrl } from "@/lib/sync";
import { getActivePairingCode } from "@/lib/syncengine/pairing";
import type { DeviceRole } from "@/lib/syncengine/types";
import {
  getPreferences,
  savePreferences,
  type ClusterId,
  type BusinessType,
  type SubCategory,
} from "@/lib/settings";

/** Configuration métier de la boutique (le « type de boutique » de l'onboarding).
 *  Copiée telle quelle d'une fiche à l'autre : la nouvelle caisse s'ouvre identique à
 *  la boutique scannée (secteur, tables, unités, domaine personnalisé…). */
export interface PairingShopConfig {
  /** Profil métier : retail, restaurant, bar, service, clothing, magasin… */
  cluster: ClusterId;
  /** Sous-catégorie du cluster Magasin, le cas échéant. */
  subCategory?: SubCategory;
  /** Domaine d'activité libre saisi pour le cluster Personnalisé. */
  customDomain: string;
  /** Stock au kilo ou à l'unité (cluster Personnalisé). */
  customUnitType?: "unit" | "weight";
  /** Snack/bar ou restaurant/fastfood. */
  businessType: BusinessType;
  /** Système de tables activé ou non (commande puis encaissement). */
  tablesEnabled: boolean;
  /** Identité de la boutique. */
  storeName: string;
  ownerName: string;
  phone: string;
  quarter: string;
}

export interface PairingPayload {
  v: 1;
  app: "ecaisse";
  /** URL de l'orchestrateur — la nouvelle caisse doit parler au même serveur. */
  url: string;
  name: string;
  phone: string;
  password: string;
  /** Code de confirmation TEMPORAIRE (code de paire P2P, valable 10 min) affiché par
   *  le principal au moment de fabriquer le QR. Le téléphone qui scanne s'annonce avec
   *  cette preuve : le principal le reconnaît `paired` d'office et les données
   *  (produits, ventes, stock) convergent au prochain échange P2P. Optionnel — absent
   *  quand aucun code n'est actif, le scan fonctionne quand même (copie boutique). */
  pair_code?: string;
  /** Copie de la boutique scannée (v1.1) : identité + type de boutique. Champs
   *  optionnels pour rester lisibles par les anciennes versions de parsePairingPayload. */
  shop?: Partial<PairingShopConfig>;
  /** Rôle assigné par le propriétaire au moment du partage (employé).
   *  Optionnel : absent dans les QR générés avant cette fonctionnalité. */
  role?: DeviceRole;
}

export type PairingShopInfo = Pick<PairingPayload, "name" | "phone" | "password"> & {
  pair_code?: string;
  shop?: Partial<PairingShopConfig>;
  role?: DeviceRole;
  /** Jeton de partage (QR v2) : réclamé au relais une fois le compte posé. Absent des QR v1. */
  token?: string;
};

export interface SharePayload {
  v: 2;
  app: "ecaisse";
  url: string;
  token: string;
  name: string;
  account_phone: string;
  pair_code: string;
  shop?: Partial<PairingShopConfig>;
  role?: DeviceRole;
}

/** Fabrique le contenu du QR depuis le profil local, ou `null` sans compte marchand.
 *  @param role  Rôle assigné au futur appareil (optionnel — absent = ancien comportement). */
export async function buildPairingPayload(role?: DeviceRole): Promise<string | null> {
  const profile = await getShopProfile();
  if (!profile?.accountPhone || !profile.accountPassword) return null;
  const prefs = getPreferences();
  const pairCode = await getActivePairingCode();
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
      subCategory: prefs.subCategory,
      customDomain: prefs.customDomain,
      customUnitType: prefs.customUnitType,
      businessType: prefs.businessType,
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

/**
 * Applique la copie de la boutique scannée à CET appareil : écrase la fiche locale
 * (profil IndexedDB + préférences) avec l'identité ET le type de boutique de l'écran
 * principal. Appelé au scan — la nouvelle caisse s'ouvre identique à celle scannée.
 * Sans coordonnées réussies, ne touche à rien.
 */
/** Réclame le jeton au relais (redeem) — renvoie la boutique et le code. */
export async function redeemShareToken(
  token: string,
  deviceId?: string,
): Promise<{
  shop_id?: string;
  account_name?: string;
  account_phone?: string;
  pair_code?: string;
} | null> {
  try {
    const relay = getOpsRelayUrl ? getOpsRelayUrl() : (getOrchestratorUrl() ?? "");
    const url = (relay || "").replace(/\/$/, "") + "/api/v1/share/redeem";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ops-token":
          typeof import.meta.env?.VITE_OPS_TOKEN === "string" ? import.meta.env.VITE_OPS_TOKEN : "",
      },
      body: JSON.stringify({ token, device_id: deviceId ?? "" }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function applyPairingShop(shop?: Partial<PairingShopConfig>): Promise<boolean> {
  if (!shop || !shop.storeName) return false;
  const prefs = getPreferences();

  // Met à jour le PROFIL IndexedDB (le nom affiché dans l'UI)
  await saveShopProfile({
    storeName: shop.storeName,
    ownerName: shop.ownerName ?? "",
    phone: shop.phone ?? "",
    location: shop.quarter ?? "",
  });

  savePreferences({
    ...prefs,
    workspaceName: shop.storeName,
    ownerName: shop.ownerName ?? prefs.ownerName,
    phone: shop.phone ?? prefs.phone,
    quarter: shop.quarter ?? prefs.quarter,
    cluster: shop.cluster ?? prefs.cluster,
    subCategory: shop.subCategory ?? prefs.subCategory,
    customDomain: shop.customDomain ?? prefs.customDomain,
    customUnitType: shop.customUnitType ?? prefs.customUnitType,
    businessType: shop.businessType ?? prefs.businessType,
    tablesEnabled: shop.tablesEnabled ?? prefs.tablesEnabled,
  });
  return true;
}
