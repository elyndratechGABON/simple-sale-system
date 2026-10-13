import { FILLERS, NUMBER_WORDS, UNITS } from "./normalize";

// ---------- Découpage ----------

/** « et » ne sépare deux articles que s'il est suivi d'une quantité (« un kilo ET DEMI » reste entier). */
export function splitChunks(text: string): string[] {
  const parts = text.split(
    /\s+(?:puis|ensuite|apres)\s+|\s+et\s+(?=(?:une?\s|deux\s|trois\s|quatre\s|cinq\s|six\s|sept\s|huit\s|neuf\s|dix\s|onze\s|douze\s|treize\s|quatorze\s|quinze\s|seize\s|vingt\s|\d))/g,
  );
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

export interface ChunkQty {
  qty: number;
  rest: string;
}

export function extractQty(chunk: string): ChunkQty {
  let qty = 1;
  let rest = chunk;

  // Préambules parlés (« je veux », « donne moi », « ajoute ») : on pèle les mots creux
  // de tête jusqu'à la quantité éventuelle. Un mot-nombre ou un chiffre arrête le pelage.
  for (;;) {
    const first = rest.match(/^[a-z]+/);
    if (!first) break;
    const token = first[0];
    if (NUMBER_WORDS[token] !== undefined || /^\d/.test(rest)) break;
    if (!FILLERS.has(token)) break;
    rest = rest.slice(token.length).trim();
  }

  // Quantité en toutes lettres (« deux coca »).
  const wordMatch = rest.match(
    /^(une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante)\b/,
  );
  if (wordMatch) {
    qty = NUMBER_WORDS[wordMatch[1]] ?? 1;
    rest = rest.slice(wordMatch[0].length).trim();
  } else {
    // Quantité chiffrée, décimales comprises (« 2 », « 1.5 »).
    const numMatch = rest.match(/^(\d+(?:\.\d+)?)(?=\s|$)/);
    if (numMatch) {
      qty = parseFloat(numMatch[1]);
      rest = rest.slice(numMatch[0].length).trim();
    }
  }

  if (!Number.isFinite(qty) || qty <= 0) qty = 1;

  // Décimales dictées : « deux virgule cinq », « un kilo et demi ».
  const virgule = rest.match(/^(virgule|point)\s+(\d+)\b/);
  if (virgule && qty >= 1 && Number.isInteger(qty)) {
    qty += parseInt(virgule[2], 10) / Math.pow(10, virgule[2].length);
    rest = rest.slice(virgule[0].length).trim();
  }
  const demie = rest.match(/\bet\s+(demie?|quart)\b/);
  if (demie) {
    qty += demie[1] === "quart" ? 0.25 : 0.5;
    rest = rest.replace(demie[0], "").trim();
  }

  return { qty, rest };
}

/** Retire quantités implicites, unités et mots creux pour ne garder que le nom cherché. */
export function toQueryTokens(rest: string): string[] {
  return rest
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/s$/, ""))
    .map((t) => (UNITS.has(t) || UNITS.has(t + "s") ? "" : t))
    .filter((t) => t.length > 0 && !FILLERS.has(t));
}
