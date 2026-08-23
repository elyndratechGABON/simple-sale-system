/**
 * Parseur de commande dictée en français — pur TypeScript, zéro dépendance.
 *
 * Entrée : la transcription brute de Whisper (« deux regab et un kilo et demi de manioc »)
 * et le catalogue produits. Sortie : les produits reconnus avec leur quantité, ce qui n'a
 * pas pu être rapproché du catalogue, et une éventuelle commande vocale (« annule »).
 *
 * Le moteur de reconnaissance vocale peut changer (Whisper local aujourd'hui, autre
 * demain) : cette couche ne dépend que du TEXTE produit, jamais du moteur.
 */

import type { Product } from "@/lib/db";

// ---------- Types publics ----------

export interface VoiceMatch {
  product: Product;
  qty: number;
}

export interface ParseResult {
  matches: VoiceMatch[];
  /** Mots dictés qui ne ressemblent à aucun produit du catalogue. */
  unknown: string[];
  command: "clear-last" | "clear-all" | null;
}

// ---------- Normalisation ----------

/** Minuscules sans accent ni ponctuation ; les décimales chiffrées deviennent « X virgule Y ». */
export function normalizeFr(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/(\d)[,.](\d)/g, "$1 virgule $2")
    .replace(/[,.;!?+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
};

const QTY_STARTER =
  /^(?:une?\s|deux\s|trois\s|quatre\s|cinq\s|six\s|sept\s|huit\s|neuf\s|dix\s|onze\s|douze\s|treize\s|quatorze\s|quinze\s|seize\s|vingt\s|trente\s|quarante\s|cinquante\s|soixante\s|\d+(?:\.\d+)?\s|$|\d)/;

// Mots creux de la parole spontanée, retirés avant le rapprochement catalogue.
const FILLERS = new Set([
  "de",
  "du",
  "des",
  "le",
  "la",
  "les",
  "l",
  "au",
  "aux",
  "a",
  "ajoute",
  "ajouter",
  "mets",
  "mettre",
  "donne",
  "donner",
  "moi",
  "je",
  "veux",
  "voudrais",
  "prends",
  "prendre",
  "aussi",
  "svp",
  "stp",
  "merci",
  "sil",
  "vous",
  "plait",
  "please",
]);

const UNITS = new Set([
  "kilo",
  "kilos",
  "kg",
  "litre",
  "litres",
  "paquet",
  "paquets",
  "boite",
  "boites",
]);

// ---------- Découpage ----------

/** « et » ne sépare deux articles que s'il est suivi d'une quantité (« un kilo ET DEMI » reste entier). */
function splitChunks(text: string): string[] {
  const parts = text.split(
    /\s+(?:puis|ensuite|apres)\s+|\s+et\s+(?=(?:une?\s|deux\s|trois\s|quatre\s|cinq\s|six\s|sept\s|huit\s|neuf\s|dix\s|onze\s|douze\s|treize\s|quatorze\s|quinze\s|seize\s|vingt\s|\d))/g,
  );
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

interface ChunkQty {
  qty: number;
  rest: string;
}

function extractQty(chunk: string): ChunkQty {
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
function toQueryTokens(rest: string): string[] {
  return rest
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/s$/, ""))
    .map((t) => (UNITS.has(t) || UNITS.has(t + "s") ? "" : t))
    .filter((t) => t.length > 0 && !FILLERS.has(t));
}

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
