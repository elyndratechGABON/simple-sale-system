import { saveShopProfile } from "@/lib/db";
import { getPreferences, savePreferences } from "@/lib/settings";
import { getOpsRelayUrl, getOrchestratorUrl } from "@/lib/sync";
import type { PairingShopConfig } from "./types";

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

/**
 * Applique la copie de la boutique scannée à CET appareil : écrase la fiche locale
 * (profil IndexedDB + préférences) avec l'identité ET le type de boutique de l'écran
 * principal. Appelé au scan — la nouvelle caisse s'ouvre identique à celle scannée.
 * Sans coordonnées réussies, ne touche à rien.
 */
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
    customDomain: shop.customDomain ?? prefs.customDomain,
    customUnitType: shop.customUnitType ?? prefs.customUnitType,
    tablesEnabled: shop.tablesEnabled ?? prefs.tablesEnabled,
  });
  return true;
}
