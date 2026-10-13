import type { ProductVariant } from "../../db";

export const touch = () => ({ updated_at: Date.now(), sync_status: "local" as const });

/** Les stocks de variantes portent-ils les mêmes valeurs ? (l'absence de variante des
 *  deux côtés compte comme « identique » : rien à réaligner). */
export function sameVariantStocks(
  next: ProductVariant[] | undefined,
  current: ProductVariant[] | undefined,
): boolean {
  const a = next?.map((v) => v.stock) ?? [];
  const b = current?.map((v) => v.stock) ?? [];
  return a.length === b.length && a.every((s, i) => s === b[i]);
}
