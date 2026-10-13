import { getDB, getShopProfile } from "../../db";
import { IDENTITY_ADOPTED_SHOP_ID } from "../types";
import { hex } from "./crypto";
import { getCachedIdentity, setCachedIdentity } from "./state";

/**
 * Recalcule le `shopId` depuis le profil compte — à invoquer après un changement de
 * compte (`setShopAccount`, connexion par mot clé). Sans effet avant un `ensureIdentity()`.
 */
export async function refreshShopId(): Promise<string | null> {
  const cache = getCachedIdentity();
  if (!cache) return null;
  const shopId = await deriveShopId(cache.deviceId);
  if (shopId !== cache.shopId) setCachedIdentity({ ...cache, shopId });
  return shopId;
}

/**
 * Adopte le `shop_id` du GROUPE transmis par le relais lors d'un appairage.
 *
 * `deriveShopId` recalcule un `shop_id` à partir du profil local. Ce n'est pas la même
 * chose que le groupe réel du commerçant : dès que le propriétaire a reçu un `accountId`
 * du serveur, le sien vaut `s_41` alors que celui dérivé du téléphone vaut
 * `SHA-256(téléphone|nom)`. Un employé qui ne fait qu'hériter du téléphone atterrit donc
 * dans un groupe à part — il encaisse, et le propriétaire ne voit rien.
 *
 * Le relais, lui, connaît le vrai groupe : c'est le `shop_id` inscrit dans
 * `share_tokens` au moment où le propriétaire a fabriqué le QR. On l'écrit tel quel, et
 * `deriveShopId` s'y tient ensuite.
 *
 * Un `shop_id` de forme inattendue est refusé : on n'écrit pas une valeur qui pourrait
 * ensuite passer pour un groupe existant.
 *
 * @returns le `shop_id` adopté, ou `null` si rien n'a été écrit.
 */
export async function adoptShopIdFromRelay(shopId: string): Promise<string | null> {
  if (!/^s_[A-Za-z0-9_-]{1,24}$/.test(shopId)) return null;
  await getDB().settings.put({ key: IDENTITY_ADOPTED_SHOP_ID, value: shopId });
  // Le cache doit refléter la valeur tout de suite : le handshake et le premier push
  // partent dans la foulée du scan, et traverseraient sinon l'ancien groupe.
  const cache = getCachedIdentity();
  if (cache) setCachedIdentity({ ...cache, shopId });
  return shopId;
}

/** Oublie le groupe adopté (purge de compte, changement de boutique). */
export async function clearAdoptedShopId(): Promise<void> {
  await getDB().settings.delete(IDENTITY_ADOPTED_SHOP_ID);
  const cache = getCachedIdentity();
  if (cache) setCachedIdentity({ ...cache, shopId: await deriveShopId(cache.deviceId) });
}

/** `s_<hash>` pour un compte marchand (partageable), `d_<device>` sinon (isolé). */
export async function deriveShopId(deviceId: string): Promise<string> {
  const profile = await getShopProfile();

  // SOURCE D'AUTORITÉ N°1 : un `shop_id` ADOPTÉ, c'est-à-dire transmis par le relais lors
  // d'un appairage (`share_tokens.shop_id`, cf. welcome.tsx `adoptShopIdFromRelay`).
  // On ne le recalcule surtout pas : il est le seul qui garantisse que l'employé atterrit
  // dans le groupe EXACT du propriétaire. Dérivé du téléphone, il serait différent.
  const adopted = await getDB()
    .settings.get(IDENTITY_ADOPTED_SHOP_ID)
    .then((r) => (typeof r?.value === "string" ? r.value : null))
    .catch(() => null);
  if (adopted && /^s_[A-Za-z0-9_-]{1,24}$/.test(adopted)) return adopted;

  let source: string | null = null;
  // SOURCE D'AUTORITÉ : l'identifiant de compte, non dérivable localement. Tant que
  // l'orchestrateur n'en fournit pas, on retombe sur la dérivation ci-dessous.
  const accountId = profile?.accountId?.trim();
  if (accountId) return `s_${accountId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24)}`;

  if (profile?.accountPhone) {
    source = `${profile.accountPhone.trim()}|${(profile.accountName ?? "").trim().toLowerCase()}`;
  } else if (profile?.accountKeyword) {
    // Écran rattaché PAR MOT CLÉ (téléphone perdu) : pas de téléphone, mais le mot clé
    // est unique par compte → les écrans du même compte convergent entre eux. Le « nom »
    // n'entre pas dans la source : chaque écran garde sa propre enseigne. Limite assumée :
    // un écran « mot clé » et un écran « téléphone+mot de passe » du MÊME compte n'ont
    // aucune source commune calculable localement — une fusion devra venir du relais.
    source = `kw|${profile.accountKeyword}`;
  }
  if (source) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    return `s_${hex(digest).slice(0, 12)}`;
  }
  return `d_${deviceId.replace(/-/g, "").slice(0, 12)}`;
}
