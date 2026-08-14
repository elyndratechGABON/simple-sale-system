// Données partagées par les quatre exports. Elles proviennent toutes de
// `computePeriodStats` : un chiffre affiché à l'écran et le même chiffre dans le PDF ne
// peuvent pas diverger.
import type { PeriodStats } from "../analytics";
import type { Sale, SaleItem } from "../db";

export interface ReportPayload {
  /** Libellé de la période, tel qu'affiché à l'écran (« 7 derniers jours »). */
  label: string;
  from: number;
  to: number;
  stats: PeriodStats;
  sales: Sale[];
  items: SaleItem[];
  /** Nom du commerce, en tête des documents. Voir src/lib/settings.ts. */
  workspaceName?: string;
}

// Date locale, surtout pas `toISOString()` : les bornes de période sont des minuits
// LOCAUX, et toISOString convertit en UTC — à l'est de Greenwich le fichier se retrouvait
// daté de la veille.
function isoLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `rapport-2026-07-26_2026-08-01.pdf` — bornes incluses, `to` étant exclusif. */
export function reportFilename(payload: ReportPayload, extension: string): string {
  return `rapport-${isoLocal(payload.from)}_${isoLocal(payload.to - 1)}.${extension}`;
}

export function itemsBySale(payload: ReportPayload): Map<string, SaleItem[]> {
  const map = new Map<string, SaleItem[]>();
  for (const item of payload.items) {
    const bucket = map.get(item.sale_id);
    if (bucket) bucket.push(item);
    else map.set(item.sale_id, [item]);
  }
  return map;
}
