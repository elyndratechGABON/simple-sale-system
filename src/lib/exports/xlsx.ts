// Export Excel via `write-excel-file/browser`.
// Choisi plutôt qu'exceljs (~1 Mo, pensé pour Node) et que SheetJS/`xlsx` (figé en 0.18.5
// sur npm avec des CVE ouvertes ; les versions à jour ne sont diffusées que par leur CDN).
import writeXlsxFile, { type Sheet } from "write-excel-file/browser";
import { formatTime } from "../format";
import { itemsBySale, type ReportPayload, reportFilename } from "./report";

type Row = Sheet<never>["data"][number];

const header = (...labels: string[]): Row =>
  labels.map((value) => ({ value, fontWeight: "bold" as const }));

// FCFA : entiers, séparateur de milliers, pas de décimales.
const money = (value: number) => ({ value: Math.round(value), type: Number, format: "# ##0" });

export async function buildXlsxBlob(payload: ReportPayload): Promise<Blob> {
  const { stats } = payload;
  const byId = itemsBySale(payload);

  const resume: Row[] = [
    header("Indicateur", "Valeur"),
    ...(payload.workspaceName
      ? [
          [
            { value: "Commerce", type: String },
            { value: payload.workspaceName, type: String },
          ],
        ]
      : []),
    [
      { value: "Période", type: String },
      { value: payload.label, type: String },
    ],
    [{ value: "Revenus", type: String }, money(stats.revenue)],
    [{ value: "Bénéfices", type: String }, money(stats.profit)],
    [
      { value: "Ventes", type: String },
      { value: stats.salesCount, type: Number },
    ],
    [
      { value: "Clients", type: String },
      { value: stats.customersCount, type: Number },
    ],
    [
      { value: "Articles vendus", type: String },
      { value: stats.itemsCount, type: Number },
    ],
    [
      { value: "Marge", type: String },
      { value: stats.marginRate, type: Number, format: "0.0%" },
    ],
    [{ value: "Panier moyen", type: String }, money(stats.averageBasket)],
    [
      { value: "Taux de croissance", type: String },
      { value: stats.growthRate, type: Number, format: "+0.0%;-0.0%" },
    ],
    [],
    [
      { value: "Généré par", type: String },
      { value: "ELYNDRA CAISSE — ELYNDRA TECH", type: String },
    ],
  ];

  const ventes: Row[] = [
    header("Date", "Heure", "Table", "Total", "Donné", "Rendu", "Clients", "Articles"),
    ...[...payload.sales]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((sale): Row => {
        const items = byId.get(sale.id) ?? [];
        return [
          { value: new Date(sale.timestamp), type: Date, format: "dd/mm/yyyy" },
          { value: formatTime(sale.timestamp), type: String },
          { value: sale.table ?? "", type: String },
          money(sale.total),
          money(sale.cash_given),
          money(sale.change_due),
          { value: sale.customers_count ?? 1, type: Number },
          { value: items.map((i) => `${i.quantity}x ${i.name}`).join(" | "), type: String },
        ];
      }),
  ];

  // Onglet séparé plutôt que fondu dans « Ventes » : contrairement au CSV qui est
  // mono-tabulaire, un classeur peut se permettre de garder les deux natures distinctes.
  const parJour: Row[] = [
    header("Jour", "Revenus", "Bénéfice", "Ventes"),
    ...stats.days.map((d): Row => [
      { value: new Date(d.day), type: Date, format: "dd/mm/yyyy" },
      money(d.revenue),
      money(d.profit),
      { value: d.salesCount, type: Number },
    ]),
  ];

  const parCategorie: Row[] = [
    header("Catégorie", "Revenus", "Bénéfices", "Part"),
    ...stats.byCategory.map((c): Row => [
      { value: c.category, type: String },
      money(c.revenue),
      money(c.profit),
      {
        value: stats.revenue > 0 ? c.revenue / stats.revenue : 0,
        type: Number,
        format: "0.0%",
      },
    ]),
  ];

  const parTable: Row[] = [
    header("Table", "Tournées", "Ventes", "Clients", "Revenus", "Bénéfice"),
    ...stats.byTable.map((t): Row => [
      { value: t.label, type: String },
      { value: t.rounds, type: Number },
      { value: t.salesCount, type: Number },
      { value: t.clients, type: Number },
      money(t.revenue),
      money(t.profit),
    ]),
  ];

  const topArticles: Row[] = [
    header("Rang", "Article", "Catégorie", "Quantité", "Revenus", "Bénéfice"),
    ...stats.topProducts.map((p, index): Row => [
      { value: index + 1, type: Number },
      { value: p.name, type: String },
      { value: p.category, type: String },
      { value: p.quantity, type: Number },
      money(p.revenue),
      money(p.profit),
    ]),
  ];

  // La clé du nom d'onglet est `sheet`, pas `name` (cf. SheetOptions de la lib).
  const sheets: Sheet<never>[] = [
    { sheet: "Résumé", data: resume },
    { sheet: "Ventes", data: ventes },
    { sheet: "Par jour", data: parJour },
    { sheet: "Par catégorie", data: parCategorie },
    { sheet: "Par table", data: parTable },
    { sheet: "Top articles", data: topArticles },
  ];

  return writeXlsxFile(sheets).toBlob();
}

export const xlsxFilename = (payload: ReportPayload) => reportFilename(payload, "xlsx");
