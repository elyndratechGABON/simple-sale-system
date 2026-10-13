import { getDB } from "./internal";

// ---------- Settings ----------
// Stockage clé/valeur des préférences durables. Sert au handle de dossier
// (`FileSystemDirectoryHandle`, structured-cloneable) utilisé par src/lib/files.ts.
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await getDB().settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDB().settings.put({ key, value });
}
