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

export const NUMBER_WORDS: Record<string, number> = {
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

// Mots creux de la parole spontanée, retirés avant le rapprochement catalogue.
export const FILLERS = new Set([
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

export const UNITS = new Set([
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
