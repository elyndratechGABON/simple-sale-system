import { formatTime } from "../format";
import type { Sale, SaleItem } from "../db";

// Export CSV de l'HISTORIQUE : la liste filtrée telle qu'elle est affichée, une ligne
// par vente. Réutilise la même convention que src/lib/exports/csv.ts (séparateur `;`,
// BOM UTF-8, ordre chronologique) pour qu'Excel l'ouvre proprement en locale française.

const SEP = ";";
const BOM = String.fromCharCode(0xfeff);

const escape = (value: string) => (value.includes(SEP) ? `"${value.replace(/"/g, '""')}"` : value);

/** Nom de fichier en accord avec le panneau affiché : scope + date du jour. */
export function salesCsvFilename(scopeLabel: string): string {
  const slug =
    scopeLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ventes";
  const day = new Date().toISOString().slice(0, 10);
  return `ventes-${slug}-${day}.csv`;
}

export function buildSalesCsvBlob(sales: Sale[], itemsBySale: Map<string, SaleItem[]>): Blob {
  const rows = [
    ["date", "heure", "table", "client", "libelle", "total", "donne", "rendu"].join(SEP),
  ];

  for (const sale of [...sales].sort((a, b) => a.timestamp - b.timestamp)) {
    const items = itemsBySale.get(sale.id) ?? [];
    rows.push(
      [
        new Date(sale.timestamp).toLocaleDateString("fr-FR"),
        formatTime(sale.timestamp),
        escape(sale.table ?? ""),
        escape(sale.client_name ?? ""),
        escape(items.map((i) => `${i.quantity}x ${i.name}`).join(" | ")),
        String(sale.total),
        String(sale.cash_given),
        String(sale.change_due),
      ].join(SEP),
    );
  }

  rows.push("");
  rows.push(["", "Généré par ELYNDRA CAISSE — ELYNDRA TECH"].join(SEP));

  return new Blob([BOM + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
}
