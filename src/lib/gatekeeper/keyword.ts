import { getSetting, getShopProfile, setSetting } from "@/lib/db";
import { SETTING_KEYWORD_CLAIM, SETTING_KEYWORD_REVEALED } from "./settings";
import type { KeywordClaim } from "./types";

// ── Vérification par mot clé de récupération (v3) ─────────────────────────────────
// Un écran qui a perdu ses identifiants (téléphone perdu) se rattache au compte via le
// mot clé reçu à la création. La réclamation (claim) est posée dès la soumission : elle
// nourrit la bannière « vérification en attente » pendant que le serveur est muet, et sa
// levée au handshake suivant matérialise la confirmation différée.
export async function getKeywordClaim(): Promise<KeywordClaim | null> {
  return (await getSetting<KeywordClaim>(SETTING_KEYWORD_CLAIM)) ?? null;
}

export async function setKeywordClaim(claim: KeywordClaim): Promise<void> {
  await setSetting(SETTING_KEYWORD_CLAIM, claim);
}

export async function clearKeywordClaim(): Promise<void> {
  await setSetting(SETTING_KEYWORD_CLAIM, null);
}

/**
 * Mot clé à encore révéler à l'écran fondateur (reçu au handshake de création, jamais
 * réaffiché ensuite) — ou `null` si déjà noté ou si la fiche n'en porte pas.
 */
export async function getKeywordToReveal(): Promise<string | null> {
  const profile = await getShopProfile();
  const revealed = Boolean(await getSetting<boolean>(SETTING_KEYWORD_REVEALED));
  if (!profile?.accountKeyword || revealed) return null;
  return profile.accountKeyword;
}

/** L'utilisateur a noté son mot clé : il ne sera plus proposé sur cet écran. */
export async function ackKeywordReveal(): Promise<void> {
  await setSetting(SETTING_KEYWORD_REVEALED, true);
}

/** Récupère (avant soumission) la valeur normalisée du mot clé saisi. */
export function normKeyword(input: string): string {
  return input.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, "");
}
