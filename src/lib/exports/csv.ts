import { formatTime } from "../format";
import { itemsBySale, type ReportPayload } from "./report";

// Séparateur `;` : c'est ce qu'Excel attend en locale française, où la virgule est le
// séparateur décimal.
const SEP = ";";
// BOM UTF-8. Sans lui Excel ouvre le fichier en ANSI et casse tous les accents
// (« Bénéfice » devient « BÃ©nÃ©fice »). Construit par code et non écrit en littéral :
// U+FEFF est invisible dans un éditeur, un formateur peut le supprimer sans que personne
// ne le voie. Ne pas le retirer.
// Attention en le vérifiant : `Blob.text()` retire le BOM à la lecture — il faut relire
// les octets via `arrayBuffer()` pour le constater.
const BOM = String.fromCharCode(0xfeff);

const escape = (value: string) => (value.includes(SEP) ? `"${value.replace(/"/g, '""')}"` : value);

export function buildCsvBlob(payload: ReportPayload): Blob {
  const byId = itemsBySale(payload);
  const rows = [
    ["date", "heure", "table", "libelle", "total", "donne", "rendu", "clients"].join(SEP),
  ];

  // Une ligne par vente, triée du plus ancien au plus récent : un tableur se lit dans
  // l'ordre du service.
  const rowsByTime: { timestamp: number; cells: string[] }[] = [];

  for (const sale of payload.sales) {
    const items = byId.get(sale.id) ?? [];
    rowsByTime.push({
      timestamp: sale.timestamp,
      cells: [
        new Date(sale.timestamp).toLocaleDateString("fr-FR"),
        formatTime(sale.timestamp),
        escape(sale.table ?? ""),
        escape(items.map((i) => `${i.quantity}x ${i.name}`).join(" | ")),
        String(sale.total),
        String(sale.cash_given),
        String(sale.change_due),
        String(sale.customers_count ?? 1),
      ],
    });
  }

  // Les ventes arrivent du plus récent au plus ancien ; un tableur se lit dans l'ordre.
  for (const row of rowsByTime.sort((a, b) => a.timestamp - b.timestamp)) {
    rows.push(row.cells.join(SEP));
  }

  // Résumés en fin de fichier, séparés par une ligne vide. Première colonne de chaque
  // bloc pour distinguer les sections sans rien casser au croisé dynamique.
  if (payload.stats.byTable.length > 0) {
    rows.push("");
    rows.push(["type", "table", "tournees", "ventes", "clients", "revenus", "benefice"].join(SEP));
    for (const t of payload.stats.byTable) {
      rows.push(
        [
          "table",
          escape(t.label),
          String(t.rounds),
          String(t.salesCount),
          String(t.clients),
          String(t.revenue),
          String(t.profit),
        ].join(SEP),
      );
    }
  }
  if (payload.stats.topProducts.length > 0) {
    rows.push("");
    rows.push(["type", "article", "categorie", "quantite", "revenus", "benefice"].join(SEP));
    for (const p of payload.stats.topProducts) {
      rows.push(
        [
          "article",
          escape(p.name),
          escape(p.category),
          String(p.quantity),
          String(p.revenue),
          String(p.profit),
        ].join(SEP),
      );
    }
  }

  return new Blob([BOM + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
}
