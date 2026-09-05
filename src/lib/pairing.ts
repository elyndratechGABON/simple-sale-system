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
import { getOrchestratorUrl } from "@/lib/sync";
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
};

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
      storeName: profile.storeName || prefs.workspaceName,
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
      const data = JSON.parse(trimmed) as Partial<PairingPayload>;
      if (
        data.app === "ecaisse" &&
        typeof data.phone === "string" &&
        data.phone.trim().length > 0 &&
        typeof data.password === "string" &&
        data.password.length >= 4
      ) {
        const shop = data.shop;
        // Le rôle porté par un QR héritage (généré avant la suppression du gérant)
        // peut être « manager » : on le relit comme « employee », jamais comme owner.
        const rawRole = data.role as string | undefined;
        const shopInfo: PairingShopInfo = {
          name: typeof data.name === "string" ? data.name : "",
          phone: data.phone.trim(),
          password: data.password,
          pair_code: typeof data.pair_code === "string" ? data.pair_code.trim() : undefined,
          role: rawRole === "employee" || rawRole === "manager" ? "employee" : undefined,
        };
        if (shop && typeof shop === "object") {
          shopInfo.shop = shop;
        }
        return shopInfo;
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
export async function applyPairingShop(shop?: Partial<PairingShopConfig>): Promise<boolean> {
  if (!shop || !shop.storeName) return false;
  const prefs = getPreferences();

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
