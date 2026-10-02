/**
 * Configuration d'affichage des cards produit.
 *
 * UN SEUL module pour deux pages (§22) : la carte de /stocks et celle de /pos n'ont
 * pas les mêmes besoins — on ne veut pas dupliquer la liste de champs, ni le rendu,
 * ni la normalisation d'une valeur relue de localStorage. Chaque page passe son propre
 * jeu de champs, la mécanique est identique.
 *
 * Les champs listés ici sont TOUS adossés à des données réelles de `Product`
 * (src/lib/db.ts) ou à des agrégats déjà calculés par la page. Aucun champ n'est
 * offered s'il n'existait pas déjà : un réglage qui afficherait « Fournisseur » sur
 * un modèle sans champ fournisseur afficherait une ligne vide, donc du vide présenté
 * comme une donnée.
 */

/** Champslags adaptables d'une card produit, dans leur ordre canonique. */
export type ProductCardField =
  | "image"
  | "name"
  | "price"
  | "stock"
  | "category"
  | "cost"
  | "margin"
  | "reference"
  | "variants"
  | "status"
  | "lastSold";

export const ALL_CARD_FIELDS: ProductCardField[] = [
  "image",
  "name",
  "price",
  "stock",
  "category",
  "cost",
  "margin",
  "reference",
  "variants",
  "status",
  "lastSold",
];

export const CARD_FIELD_LABELS: Record<ProductCardField, string> = {
  image: "Image",
  name: "Nom",
  price: "Prix",
  stock: "Stock",
  category: "Catégorie",
  cost: "Prix d'achat",
  margin: "Marge",
  reference: "Référence",
  variants: "Variantes",
  status: "État du stock",
  lastSold: "Dernière vente",
};

/** Contextes d'affichage : la même mécanique, deux réglages distincts. */
export type CardContext = "stocks" | "caisse";

export const CARD_PRESETS: Record<"compact" | "standard" | "detailed", ProductCardField[]> = {
  compact: ["image", "name", "price"],
  standard: ["image", "name", "price", "stock"],
  detailed: ["image", "name", "price", "stock", "category", "reference"],
};

/**
 * Nettoie une valeur relue de localStorage.
 *
 * localStorage est une entrée non fiable : une écriture tronquée, une version
 * antérieure du code ou un utilisateur qui bricole la base peuvent y laisser un
 * champ inconnu, un doublon ou une liste vide. On repart donc toujours de la liste
 * canonique : un champ qui ne figure pas dans `ALL_CARD_FIELDS` est ignoré, et
 * l'ordre de l'enregistrement est respecté pour les champs connus.
 */
export function normalizeCardFields(value: unknown, fallback: ProductCardField[]): ProductCardField[] {
  if (!Array.isArray(value)) return [...fallback];
  const seen = new Set<ProductCardField>();
  const out: ProductCardField[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    if (!(ALL_CARD_FIELDS as string[]).includes(raw)) continue;
    const field = raw as ProductCardField;
    if (seen.has(field)) continue;
    seen.add(field);
    out.push(field);
  }
  // Sans nom ni image une card n'a plus de titre ni de repère visuel : on rétablit
  // le minimum qui garde la grille lisible plutôt que d'afficher des cadres vides.
  if (!seen.has("name")) out.unshift("name");
  return out;
}

/** Applique un preset : remplace intégralement la liste (c'est l'intention d'un preset). */
export function presetFields(preset: keyof typeof CARD_PRESETS): ProductCardField[] {
  return [...CARD_PRESETS[preset]];
}

/**
 * Déplace un champ d'un cran. Toucher deux fois le même bouton ramène à la position
 * de départ — alternative mobile au drag & drop, sans dépendance et sans gesture
 * à interpréter au doigt dans une liste dense.
 */
export function moveField(
  fields: ProductCardField[],
  field: ProductCardField,
  dir: 1 | -1,
): ProductCardField[] {
  const i = fields.indexOf(field);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= fields.length) return fields;
  const next = [...fields];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}