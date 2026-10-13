import { applyPairingShop, parsePairingPayload, redeemShareToken } from "@/lib/pairing";
import { savePreferences } from "@/lib/settings";
import { saveShopProfile, setShopAccount } from "@/lib/db";
import {
  adoptShopIdFromRelay,
  ensureIdentity,
  refreshShopId,
  setIdentityRole,
} from "@/lib/syncengine/identity";

export type JoinScanOutcome =
  { status: "cancelled" } | { status: "bad-code" } | { status: "ok"; pairCode: string | undefined };

/** Scanne le QR du propriétaire et applique sa boutique complète à cet appareil. */
export async function runJoinScan(
  startScan: () => Promise<string | null>,
  invalidatePrefs: () => void,
): Promise<JoinScanOutcome> {
  const raw = await startScan();
  if (!raw) return { status: "cancelled" };
  const parsed = parsePairingPayload(raw);
  if (!parsed) return { status: "bad-code" };
  // 0. Identité d'appareil d'abord : le deviceId est nécessaire à la rédemption du jeton.
  const identity = await ensureIdentity();
  // QR v2 (jeton) : réclame le jeton au relais — il renvoie les identifiants OFFICIELS
  // du compte (account_phone/account_name) qui fixent le groupe `s_` partagé, ainsi que
  // le code de paire. QR v1 (mot de passe) : tout est déjà dans le payload.
  let accountName = parsed.name || "";
  let accountPhone = parsed.phone || parsed.shop?.phone || "";
  let pairCode = parsed.pair_code;
  // Le `shop_id` du GROUPE, tel que le relais l'a dans `share_tokens`. C'est le seul
  // moyen de garantir la convergence : le recalculer depuis le téléphone ou le mot
  // clé (cf. deriveShopId) produit un AUTRE groupe si le propriétaire a un accountId
  // serveur — et les deux écrans ne se verraient plus, silencieusement.
  let relayShopId: string | undefined;
  if (parsed.token) {
    const redeem = await redeemShareToken(parsed.token, identity.deviceId);
    if (redeem) {
      if (redeem.account_name) accountName = redeem.account_name;
      if (redeem.account_phone) accountPhone = redeem.account_phone;
      if (redeem.pair_code) pairCode = redeem.pair_code;
      if (redeem.shop_id) relayShopId = redeem.shop_id;
    }
  }
  // 1. Applique la copie complète de la boutique du propriétaire.
  await applyPairingShop(parsed.shop);
  // 2. Force le nom de la boutique dans le profil local (pas "Ma boutique").
  const storeFromQr = parsed.shop?.storeName || accountName || "";
  if (storeFromQr) {
    await savePreferences({
      workspaceName: storeFromQr,
      onboarded: true,
      onboardingCompleted: true,
    });
    invalidatePrefs();
  }
  // 3. Pose le compte en mode "lien" — tél/nom du compte PROPRIÉTAIRE. Nécessaire pour que
  // le handshake atteigne le bon compte, mais INSUFFISANT pour la convergence : voir
  // l'étape 3 bis.
  await setShopAccount({
    name: accountName,
    phone: accountPhone,
    password: "",
    ownerName: "",
  });
  // Force le profil IndexedDB avec les identifiants du compte propriétaire.
  await saveShopProfile({
    storeName: parsed.shop?.storeName || parsed.shop?.ownerName || accountName || "",
    ownerName: "",
    phone: parsed.shop?.phone || accountPhone || "",
    location: parsed.shop?.quarter || "",
    accountName,
    accountPhone,
  });
  // 4. Force le rôle employé et le groupe P2P au scan.
  await setIdentityRole("employee");

  // 3 bis. Le relais a fourni le `shop_id` du groupe (`share_tokens.shop_id`) :
  // on l'ADOPTE au lieu de laisser `deriveShopId` le recalculer. Sans cela, un
  // propriétaire porteur d'un `accountId` serveur (`s_41`) et son employé dérivé
  // local (`s_<sha du téléphone>`) atterrissent dans deux boîtes aux lettres
  // distinctes — le vendeur encaisse, le patron ne voit rien, sans message.
  //
  // Format attendu : `s_<accountId>` ou `s_<hash>` — `deriveShopId` le reconnaît et
  // n'écrasera pas cet identifiant par le sien.
  if (relayShopId && /^s_[A-Za-z0-9_-]{1,24}$/.test(relayShopId)) {
    await adoptShopIdFromRelay(relayShopId);
  }

  await refreshShopId();
  return { status: "ok", pairCode };
}
