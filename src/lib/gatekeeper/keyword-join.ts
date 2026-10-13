import { setSetting, setShopKeyword } from "@/lib/db";
import { handshake } from "./handshake";
import { clearKeywordClaim, normKeyword, setKeywordClaim } from "./keyword";
import { setLock } from "./lock";
import { SETTING_LOCK_REASON, SETTING_LOCKED } from "./settings";
import type { KeywordJoinInput, KeywordJoinResult } from "./types";

// ── Connexion par mot clé de récupération (v3) ────────────────────────────────────
/**
 * Rattache cet écran au compte marchand via le mot clé de récupération.
 *
 * Le serveur est JOINT au minimum : si la vérification aboutit, on est `verified` ;
 * si le mot clé est inconnu, `blocked` (le verrou `keyword_invalid` est déjà posé par
 * `handshake` → écran de blocage dur) ; si le serveur est muet, la réclamation reste
 * posée → bannière « vérification sous 48 h » et confirmation différée au prochain
 * handshake réussi.
 */
export async function joinByKeyword(input: KeywordJoinInput): Promise<KeywordJoinResult> {
  const keyword = normKeyword(input.keyword);
  if (!keyword) return { status: "blocked" };
  await setShopKeyword(keyword);
  await setKeywordClaim({
    storeName: input.storeName.trim(),
    ownerName: input.ownerName.trim(),
    keyword,
    submittedAt: Date.now(),
  });
  const result = await handshake();
  if (result.ok) {
    await clearKeywordClaim();
    return { status: "verified" };
  }
  if (result.reason === "keyword_invalid") {
    await clearKeywordClaim();
    return { status: "blocked" };
  }
  return { status: "pending" };
}

/**
 * Réinitialise le blocage « mot clé invalide » : retire le verrou, la réclamation et le
 * mot clé de la fiche pour permettre une nouvelle tentative (bouton Réessayer).
 */
export async function resetKeywordBlock(): Promise<void> {
  await setShopKeyword(null);
  await clearKeywordClaim();
  await setSetting(SETTING_LOCKED, false);
  await setSetting(SETTING_LOCK_REASON, null);
  setLock(false, null);
}
