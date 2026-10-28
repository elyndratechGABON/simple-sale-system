import { refreshShopId } from "../syncengine/identity";
import { getDB, touch, uid } from "./internal";
import type { ShopProfile } from "./types/shop";
import type { SyncFields } from "./types/sync";

/** Profil boutique (licence) -------------------------
// L'identité de l'établissement, pré-enregistrée localement et poussée à l'orchestrateur.
// La durée de l'essai est le miroir de `orchestrator/src/config.ts` : le SERVEUR calcule
// et renvoie l'échéance, ceci n'est que la valeur affichée tant qu'aucune synchronisation
// n'a eu lieu.
*/

const TRIAL_DAYS = 14;
const TRIAL_DAYS_MS = TRIAL_DAYS * 86_400_000;

/** Le profil de l'appareil, ou null s'il n'est pas encore inscrit. */
export async function getShopProfile(): Promise<ShopProfile | null> {
  return (await getDB().shop_profiles.get("me")) ?? null;
}

/**
 * Crée la fiche au premier accès, sans démarche : la boutique se déclare d'elle-même
 * quand l'application s'ouvre, avec le nom de l'espace de travail choisi à l'onboarding
 * comme nom de boutique. Le propriétaire, le téléphone et le lieu — inconnus à ce stade —
 * se complètent dans Paramètres, où `saveShopProfile` enrichit la même fiche (même
 * `deviceId`, pas de doublon chez l'orchestrateur).
 */
export async function ensureShopProfile(storeName: string): Promise<ShopProfile> {
  const db = getDB();
  const existing = await db.shop_profiles.get("me");
  if (existing) return existing;
  const now = Date.now();
  const profile: ShopProfile = {
    id: "me",
    deviceId: uid(),
    ownerName: "",
    storeName: storeName.trim() || "Ma boutique",
    registrationDate: now,
    expiryDate: now + TRIAL_DAYS_MS,
    ...touch(),
  };
  await db.shop_profiles.put(profile);
  return profile;
}

/**
 * Crée ou met à jour le profil. À la création : inscription datée de maintenant, essai
 * de 14 jours, identifiant d'appareil généré une fois pour toutes. À la mise à jour :
 * seules les quatre infos changent, dates et identifiant restent stables.
 */
export async function saveShopProfile(
  input: Omit<
    ShopProfile,
    "id" | "deviceId" | "registrationDate" | "expiryDate" | keyof SyncFields
  >,
): Promise<ShopProfile> {
  const db = getDB();
  const existing = await db.shop_profiles.get("me");
  const now = Date.now();
  const profile: ShopProfile = existing
    ? { ...existing, ...input, ...touch() }
    : {
        ...input,
        id: "me",
        deviceId: uid(),
        registrationDate: now,
        expiryDate: now + TRIAL_DAYS_MS,
        ...touch(),
      };
  await db.shop_profiles.put(profile);
  return profile;
}

/**
 * Échéance reçue de l'orchestrateur : le serveur fait foi sur les prolongations, sa
 * valeur remplace l'essai local calculé à l'inscription.
 */
export async function setShopExpiry(expiryDate: number): Promise<void> {
  const db = getDB();
  const profile = await db.shop_profiles.get("me");
  if (!profile) return;
  await db.shop_profiles.put({ ...profile, expiryDate, ...touch() });
}

/**
 * Rattache l'appareil à un compte marchand (créé ou rejoint à l'onboarding). Les trois
 * champs partent ensemble au handshake : c'est la clé que le serveur utilise pour
 * retrouver — ou créer — le compte, puis y rattacher cette caisse.
 */
export async function setShopAccount(input: {
  name: string;
  phone: string;
  password: string;
  /** Nom du propriétaire, demandé à la création du compte et porté par la fiche. */
  ownerName?: string;
}): Promise<void> {
  const profile = await ensureShopProfile("");
  await getDB().shop_profiles.put({
    ...profile,
    accountName: input.name.trim() || profile.storeName,
    accountPhone: input.phone.trim(),
    accountPassword: input.password,
    ownerName: input.ownerName?.trim() || profile.ownerName,
    ...touch(),
  });
  // Le `shopId` du moteur descend du compte : une ré-association change donc le groupe
  // de partage. Inoffensif si l'identité n'est pas encore chargée.
  await refreshShopId();
}

/**
 * Pose (ou retire, `null`) le mot clé de récupération du compte. Utilisé au moment de
 * la connexion par mot clé (périphérie : téléphone perdu) et par l'écran créateur à la
 * réception du mot clé généré par le serveur.
 */
export async function setShopKeyword(keyword: string | null): Promise<void> {
  const db = getDB();
  const profile = await db.shop_profiles.get("me");
  if (!profile) return;
  await db.shop_profiles.put({
    ...profile,
    accountKeyword: keyword ? keyword.trim().toUpperCase() : undefined,
    ...touch(),
  });
}

/**
 * Pose l'identifiant de compte opaque renvoyé par l'orchestrateur. Il remplace la
 * dérivation locale téléphone+nom comme source du `shopId` (cf. `deriveShopId`), qu'il
 * rend non énumérable. `null` efface — utile si le compte est dissocié.
 */
export async function setShopAccountId(accountId: string | null): Promise<void> {
  const db = getDB();
  const profile = await db.shop_profiles.get("me");
  if (!profile) return;
  await db.shop_profiles.put({
    ...profile,
    accountId: accountId?.trim() || undefined,
    ...touch(),
  });
}

/** Marque un envoi réussi vers l'orchestrateur. */
export async function markShopSynced(syncedAt: number): Promise<void> {
  const db = getDB();
  const profile = await db.shop_profiles.get("me");
  if (!profile) return;
  await db.shop_profiles.put({
    ...profile,
    ...touch(),
    lastSyncedAt: syncedAt,
    sync_status: "synced",
  });
}
