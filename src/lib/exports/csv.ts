import { lineProfit } from "../analytics";
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
    ["type", "date", "heure", "libelle", "total", "donne", "rendu", "benefice", "clients"].join(
      SEP,
    ),
  ];

  // Ventes et dépenses dans un SEUL fichier, distinguées par la colonne `type` : un CSV
  // est mono-tabulaire, et deux fichiers séparés obligeraient l'utilisateur à les
  // recroiser à la main pour retrouver le bénéfice net. Le tri est chronologique global.
  const rowsByTime: { timestamp: number; cells: string[] }[] = [];

  for (const sale of payload.sales) {
    const items = byId.get(sale.id) ?? [];
    const profit = items.reduce((sum, i) => sum + lineProfit(i), 0);
    rowsByTime.push({
      timestamp: sale.timestamp,
      cells: [
        "vente",
        new Date(sale.timestamp).toLocaleDateString("fr-FR"),
        formatTime(sale.timestamp),
        escape(items.map((i) => `${i.quantity}x ${i.name}`).join(" | ")),
        String(sale.total),
        String(sale.cash_given),
        String(sale.change_due),
        String(profit),
        String(sale.customers_count ?? 1),
      ],
    });
  }

  for (const expense of payload.expenses) {
    rowsByTime.push({
      timestamp: expense.timestamp,
      cells: [
        "depense",
        new Date(expense.timestamp).toLocaleDateString("fr-FR"),
        formatTime(expense.timestamp),
        escape(`${expense.category} — ${expense.label}`),
        // Montant NÉGATIF : sommer la colonne `total` du fichier doit donner le résultat
        // net, pas un chiffre d'affaires gonflé par les sorties d'argent.
        String(-expense.amount),
        "",
        "",
        String(-expense.amount),
        "",
      ],
    });
  }

  // Les ventes arrivent du plus récent au plus ancien ; un tableur se lit dans l'ordre.
  for (const row of rowsByTime.sort((a, b) => a.timestamp - b.timestamp)) {
    rows.push(row.cells.join(SEP));
  }

  return new Blob([BOM + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
}
