/**
 * Parseur de commande dictée en français — pur TypeScript, zéro dépendance.
 *
 * Entrée : la transcription brute de Whisper (« deux regab et un kilo et demi de manioc »)
 * et le catalogue produits. Sortie : les produits reconnus avec leur quantité, ce qui n'a
 * pas pu être rapproché du catalogue, et une éventuelle commande vocale (« annule »).
 *
 * Le moteur de reconnaissance vocale peut changer (Whisper local aujourd'hui, autre
 * demain) : cette couche ne dépend que du TEXTE produit, jamais du moteur.
 *
 * (normalize.ts) normalisation des mots ; (tokens.ts) découpage et quantités ;
 * (match.ts) rapprochement Levenshtein ; (parse.ts) point d'entrée.
 */
export { matchProduct } from "./match";
export { normalizeFr } from "./normalize";
export { parseOrder } from "./parse";
export type { ParseResult, VoiceMatch } from "./types";
