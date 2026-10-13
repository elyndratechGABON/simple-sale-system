import type { Product } from "@/lib/db";
import { normalizeFr } from "./normalize";

// ---------- Rapprochement catalogue ----------

/** Distance de Levenshtein bornée par taille de mot (les noms de produits sont courts). */
function levRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (Math.abs(a.length - b.length) > Math.max(a.length, b.length) * 0.6) return 0;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

const MATCH_THRESHOLD = 0.55;

function scoreProduct(queryTokens: string[], nameNorm: string): number {
  const nameTokens = nameNorm.split(" ").filter(Boolean);
  if (
    queryTokens.length > 0 &&
    (nameNorm.includes(queryTokens.join(" ")) || queryTokens.join(" ").includes(nameNorm))
  ) {
    return 1;
  }
  let total = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const n of nameTokens) {
      best = Math.max(best, levRatio(q, n));
    }
    total += best;
  }
  // La couverture compte : trois mots dont un seul ressemblant ne fait pas un match.
  return total / queryTokens.length;
}

export function matchProduct(
  queryTokens: string[],
  products: Product[],
): { product: Product; score: number } | null {
  if (queryTokens.length === 0) return null;
  const ranked = products
    .map((product) => ({
      product,
      score: scoreProduct(queryTokens, normalizeFr(product.name)),
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < MATCH_THRESHOLD) return null;
  // Deux candidats ex æquo : on refuse de choisir à la place du commerçant.
  const second = ranked[1];
  if (second && second.score >= MATCH_THRESHOLD && top.score - second.score < 0.05) return null;
  return top;
}
