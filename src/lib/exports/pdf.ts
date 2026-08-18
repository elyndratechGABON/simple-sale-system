import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDayShort, formatFCFA, formatPercent } from "../format";
import { type ReportPayload, reportFilename } from "./report";

// Les montants passent par `formatFCFA`, qui sépare les milliers avec une espace
// insécable (U+00A0). Les polices standard de jsPDF ne la rendent pas correctement :
// on la remplace par une espace ordinaire pour le PDF uniquement.
//
// L'échappement `\u00a0` est volontaire : écrit en littéral, le caractère est invisible
// dans un éditeur et un formateur ou un copier-coller peut le supprimer sans que
// personne ne le voie. C'est aussi ce que réclame la règle ESLint no-irregular-whitespace.
const pdfText = (value: string) => value.replace(/\u00a0/g, " ");
const money = (value: number) => pdfText(formatFCFA(value));

/**
 * Capture un graphique recharts en PNG pour l'insérer dans le PDF.
 * recharts rend du SVG : il faut le sérialiser puis le peindre dans un canvas, car
 * jsPDF n'avale que des images matricielles.
 * Renvoie null si la capture échoue — le PDF reste valide, sans l'illustration.
 */
export async function captureChartPng(container: HTMLElement | null): Promise<string | null> {
  const svg = container?.querySelector("svg");
  if (!svg) return null;
  try {
    const clone = svg.cloneNode(true) as SVGElement;
    const { width, height } = svg.getBoundingClientRect();
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    // Le SVG détaché du document perd les variables CSS : les couleurs deviennent
    // transparentes. On force un fond blanc et on garde les traits tels que sérialisés.
    const source = new XMLSerializer().serializeToString(clone);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    const scale = 2; // lisibilité à l'impression
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function buildPdfBlob(payload: ReportPayload, chartPng: string | null): Blob {
  const { stats } = payload;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  doc.setFontSize(18);
  doc.text(pdfText(payload.workspaceName || "Rapport de ventes"), margin, y);
  y += 20;
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    pdfText(
      `${payload.label} · du ${formatDayShort(payload.from)} au ${formatDayShort(payload.to - 1)}`,
    ),
    margin,
    y,
  );
  doc.setTextColor(0);
  y += 24;

  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Revenus", money(stats.revenue)],
      ["Bénéfices", money(stats.profit)],
      ["Ventes", String(stats.salesCount)],
      ["Clients", String(stats.customersCount)],
      ["Articles vendus", String(stats.itemsCount)],
      ["Marge", formatPercent(stats.marginRate)],
      ["Panier moyen", money(stats.averageBasket)],
      ["Taux de croissance", formatPercent(stats.growthRate, true)],
      [
        "Meilleur jour",
        stats.bestDay
          ? `${formatDayShort(stats.bestDay.day)} — ${money(stats.bestDay.revenue)}`
          : "—",
      ],
      [
        "Jour le moins rentable",
        stats.worstDay
          ? `${formatDayShort(stats.worstDay.day)} — ${money(stats.worstDay.profit)}`
          : "—",
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [22, 128, 84] },
    margin: { left: margin, right: margin },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  if (chartPng) {
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const height = width / 3;
    // Le 8e argument est la compression. Sans lui jsPDF embarque le bitmap brut : le
    // rapport pesait 5,3 Mo pour un seul graphique. Avec "FAST" (deflate) il tombe sous
    // les 200 Ko. Ne pas retirer cet argument.
    doc.addImage(chartPng, "PNG", margin, y, width, height, undefined, "FAST");
    y += height + 24;
  }

  autoTable(doc, {
    startY: y,
    head: [["Jour", "Revenus", "Bénéfice", "Ventes"]],
    body: stats.days.map((d) => [
      formatDayShort(d.day),
      money(d.revenue),
      money(d.profit),
      String(d.salesCount),
    ]),
    theme: "grid",
    headStyles: { fillColor: [22, 128, 84] },
    margin: { left: margin, right: margin },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  autoTable(doc, {
    startY: y,
    head: [["Catégorie", "Revenus", "Bénéfices", "Part"]],
    body: stats.byCategory.map((c) => [
      c.category,
      money(c.revenue),
      money(c.profit),
      formatPercent(stats.revenue > 0 ? c.revenue / stats.revenue : 0),
    ]),
    theme: "grid",
    headStyles: { fillColor: [22, 128, 84] },
    margin: { left: margin, right: margin },
  });

  // Les tableaux de répartition ne sont imprimés que s'il y a des données : une table
  // vide dans un rapport donne l'impression d'un bug.
  if (stats.byTable.length > 0) {
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    autoTable(doc, {
      startY: y,
      head: [["Table", "Tournées", "Ventes", "Clients", "Revenus", "Bénéfice"]],
      body: stats.byTable.map((t) => [
        t.label,
        String(t.rounds),
        String(t.salesCount),
        String(t.clients),
        money(t.revenue),
        money(t.profit),
      ]),
      theme: "grid",
      headStyles: { fillColor: [22, 128, 84] },
      margin: { left: margin, right: margin },
    });
  }

  if (stats.topProducts.length > 0) {
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    autoTable(doc, {
      startY: y,
      head: [["#", "Article", "Catégorie", "Qté", "Revenus", "Bénéfice"]],
      body: stats.topProducts.map((p, index) => [
        String(index + 1),
        p.name,
        p.category,
        String(p.quantity),
        money(p.revenue),
        money(p.profit),
      ]),
      theme: "grid",
      headStyles: { fillColor: [22, 128, 84] },
      margin: { left: margin, right: margin },
    });
  }

  // Footer ELYNDRA TECH
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(pdfText("Généré par ELYNDRA CAISSE — ELYNDRA TECH"), margin, pageHeight - 20);

  return doc.output("blob");
}

export const pdfFilename = (payload: ReportPayload) => reportFilename(payload, "pdf");
