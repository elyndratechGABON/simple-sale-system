import { ensureIdentity, getIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";
import { getDB } from "./internal";
import { getSetting } from "./settings";
import { CATEGORIES, type Category } from "./types/sync";

// ---------- Catégories ----------
// Les catégories fixes vivent dans `CATEGORIES` ; les catégories créées par le commerce
// s'ajoutent à côté, dans les préférences, et la liste affichée est toujours la
// concaténation des deux. Une catégorie qui n'a plus aucun produit n'est jamais nettoyée
// d'office : elle est un choix du commerce, pas un artefact à récolter.
const CUSTOM_CATEGORIES_KEY = "custom_categories";

/** Catégories fixes + catégories personnalisées, dans l'ordre d'affichage. */
export async function listCategories(): Promise<Category[]> {
  const custom = await getSetting<string[]>(CUSTOM_CATEGORIES_KEY);
  return [...CATEGORIES, ...(custom ?? [])];
}

/** Crée une catégorie personnalisée si elle n'existe pas déjà. Renvoie son nom exact. */
export async function addCategory(label: string): Promise<Category> {
  await ensureIdentity();
  const name = label.trim();
  if (!name) throw new Error("Nom de catégorie requis.");
  const current = await listCategories();
  if (current.includes(name)) return name;
  const custom = (await getSetting<string[]>(CUSTOM_CATEGORIES_KEY)) ?? [];
  const db = getDB();
  await db.transaction("rw", db.settings, db.sync_ops, async () => {
    await db.settings.put({ key: CUSTOM_CATEGORIES_KEY, value: [...custom, name] });
    // L'op garde la trace de la création ; l'application côté pair est délibérément
    // différée (les catégories personnalisées vivent dans les préférences locales).
    await emitOp(db, getIdentity(), {
      type: "category.created",
      entity_id: name,
      payload: { name },
    });
  });
  return name;
}
