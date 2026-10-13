import { alive, getDB, touch } from "./internal";
import type { ClosingImport } from "./types/shop";
import type { SyncFields } from "./types/sync";

// ---------- Clôtures d'employés importées (QR de restitution) ----------
// Trace locale du côté propriétaire : chaque QR agrégé scanné devient un enregistrement.
// L'id est DÉTERMINISTE (restitution.ts) — l'insérer suppose qu'il n'existe pas déjà,
// c'est la protection anti-doublon (rescanner un QR déjà importé ne change rien).

/** Toutes les clôtures importées, de la plus récente à la plus ancienne. */
export async function listClosings(): Promise<ClosingImport[]> {
  const rows = await getDB().closings.toArray();
  return alive(rows).sort((a, b) => b.importedAt - a.importedAt);
}

/** Une clôture importée par son identifiant (anti-doublon). */
export async function getClosing(id: string): Promise<ClosingImport | undefined> {
  const row = await getDB().closings.get(id);
  return row && !row.deleted_at ? row : undefined;
}

/** Enregistre une clôture importée. Écrase si l'id existe déjà (idempotent). */
export async function saveClosingImport(
  closing: Omit<ClosingImport, keyof SyncFields>,
): Promise<void> {
  await getDB().closings.put({ ...closing, ...touch() });
}

/** Retire logiquement une clôture importée (ne touche jamais aux ventes réelles). */
export async function deleteClosingImport(id: string): Promise<void> {
  const row = await getDB().closings.get(id);
  if (!row || row.deleted_at) return;
  await getDB().closings.put({ ...row, deleted_at: Date.now(), ...touch() });
}
