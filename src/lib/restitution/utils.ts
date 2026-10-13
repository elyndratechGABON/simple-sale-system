/** Parse un objet JSON, ou `null` si le texte n'est pas un objet JSON valide. */
export function tryParseObj(text: unknown): Record<string, unknown> | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed || !trimmed.startsWith("{")) return null;
  try {
    const data = JSON.parse(trimmed) as unknown;
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function jsonSize(value: unknown): number {
  return JSON.stringify(value).length;
}

export function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
