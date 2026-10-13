import type { Product } from "@/lib/db";
import { matchProduct } from "./match";
import { normalizeFr } from "./normalize";
import { extractQty, splitChunks, toQueryTokens } from "./tokens";
import type { ParseResult, VoiceMatch } from "./types";

// ---------- Commandes vocales ----------

function detectCommand(text: string): ParseResult["command"] {
  if (
    /(annule|efface|vide|supprime)[a-z]*\s+(tout|le panier|la commande)|tout\s+(annuler|effacer|supprimer|vider)/.test(
      text,
    )
  ) {
    return "clear-all";
  }
  if (
    /(annule|enleve|supprime|retire|efface)[a-z]*(\s+(le|la)\s+dernier|\s+derniere?|\s+ca|\s+sa)?$/.test(
      text,
    )
  ) {
    return "clear-last";
  }
  return null;
}

// ---------- Point d'entrée ----------

export function parseOrder(transcript: string, products: Product[]): ParseResult {
  const text = normalizeFr(transcript);
  if (!text) return { matches: [], unknown: [], command: null };

  const command = detectCommand(text);
  if (command) return { matches: [], unknown: [], command };

  const matches: VoiceMatch[] = [];
  const unknown: string[] = [];

  for (const chunk of splitChunks(text)) {
    const { qty, rest } = extractQty(chunk);
    const tokens = toQueryTokens(rest);
    if (tokens.length === 0) continue;
    const hit = matchProduct(tokens, products);
    if (hit) matches.push({ product: hit.product, qty });
    else unknown.push(tokens.join(" "));
  }

  return { matches, unknown, command: null };
}
