// Archives financières automatiques — moteur (mission archives, Étapes 3+4).
//
// À CHAQUE BOOT, `ensureFinancialSnapshot` compare la date du jour ARCHIVÉ (le plus
// récent en base) à la fréquence choisie (`Preferences.snapshotFrequency`, en jours) et
// archive la journée ÉCOULÉE (hier) au passage du seuil.
//
// PDF : la sortie humaine est une fenêtre d'impression stylée — le navigateur propose
// « Enregistrer au format PDF » sans dépendance installée. JSON téléchargé en repli
// (popup bloquée). Journal LOCAL : les archives sont l'historique de CET appareil,
// exclues du snapshot de sauvegarde (raison dans snapshot-exhaustivity.test.ts).
import { getDB } from "@/lib/db";
import type { FinancialSnapshot } from "@/lib/db";
import { listSales, getSaleItemsForSales } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";
import { computePeriodStats, lineProfit } from "@/lib/analytics";
import { getPreferences, savePreferences } from "@/lib/settings";
import { formatFCFA } from "@/lib/format";

/** Options de fréquence proposées à l'utilisateur (days → libellé). */
export const SNAPSHOT_OPTIONS = [
  { days: 1, label: "Chaque jour" },
  { days: 5, label: "Tous les 5 jours" },
  { days: 7, label: "Chaque semaine" },
  { days: 30, label: "Chaque mois" },
] as const;

export const DEFAULT_SNAPSHOT_FREQUENCY = 7;

export function snapshotFrequency(): number {
  const n = Number(getPreferences().snapshotFrequency);
  // Un réglage corrompu (0, NaN, négatif) retombe sur le défaut : au pire une archive
  // de plus par semaine, jamais un blocage de l'archivage.
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_SNAPSHOT_FREQUENCY;
}

export function setSnapshotFrequency(days: number): void {
  savePreferences({ snapshotFrequency: Math.max(1, Math.round(days)) });
}

/** Les archives, du plus récent au plus ancien. */
export function listFinancialSnapshots(): Promise<FinancialSnapshot[]> {
  return getDB().financial_snapshots.orderBy("created_at").reverse().toArray();
}

/** Le jour ARCHIVÉ le plus récent (0 = aucune archive). */
export async function lastSnapshotDay(): Promise<number> {
  const last = await getDB().financial_snapshots.toCollection().last();
  return last?.day ?? 0;
}

/**
 * Archive la journée ÉCOULÉE (hier). Chiffres calculés par `computePeriodStats` :
 * CA, ventes, panier moyen ; le bénéfice reste la SOMME figure par figure au coût
 * FIGÉ des lignes (cf. `lineProfit`) — cohérent avec l'écran jour du rapport.
 * `id` = jour de l'archive, donc un même jour ne peut pas s'écrire deux fois.
 */
export async function snapshotYesterday(): Promise<FinancialSnapshot> {
  const yesterday = subDays(startOfDay(Date.now()), 1);
  const from = startOfDay(yesterday.getTime()).getTime();
  const to = startOfDay(Date.now()).getTime();
  const sales = await listSales(from, to);
  const items = await getSaleItemsForSales(sales.map((s) => s.id));
  const stats = computePeriodStats(sales, items, from, to);
  const snapshot: FinancialSnapshot = {
    id: `fin-${from}`,
    day: from,
    created_at: Date.now(),
    revenue: stats.revenue,
    profit: items.reduce((sum, i) => sum + lineProfit(i), 0),
    salesCount: stats.salesCount,
    averageBasket: stats.salesCount > 0 ? Math.round(stats.averageBasket) : 0,
  };
  await getDB().financial_snapshots.put(snapshot);
  return snapshot;
}

/**
 * L'archivage AUTOMATIQUE de la session : si le dernier jour archivé date d'une
 * différence de jours supérieure ou égale à la fréquence, on archive HIER. Idempotent :
 * l'`id` vaut le jour archivé, relancer le boot ne crée jamais de doublon.
 */
export async function ensureFinancialSnapshot(): Promise<void> {
  const lastDay = await lastSnapshotDay();
  const yesterday = subDays(startOfDay(Date.now()), 1).getTime();
  // Déjà à jour (ou mieux — l'utilisateur est allé DANS LE FUTUR) : rien à faire.
  if (lastDay >= yesterday) return;
  const gapDays = Math.floor((Date.now() - lastDay) / 86_400_000);
  if (gapDays >= snapshotFrequency()) {
    await snapshotYesterday();
  }
}

/** Fichier du download de repli (popup bloquée). */
function pdfFallback(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Génère le PDF d'un snapshot : fenêtre d'impression mise en forme (le navigateur
 * fait la conversion « Enregistrer au format PDF »). Popup bloquée = le HTML de la
 * feuille est téléchargé, imprimable depuis n'importe quel lecteur.
 */
export function downloadFinancialSnapshotPdf(snapshot: FinancialSnapshot): void {
  const label = new Date(snapshot.day).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const intro = new Date(snapshot.created_at).toLocaleString("fr-FR");
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><title>État financier — ${label}</title>
<style>
  @page { margin: 2.5rem; }
  body { font: 15px/1.5 system-ui, -apple-system, sans-serif; color: #222; margin: 0 auto; max-width: 40rem; }
  header { border-bottom: 2px solid #0a7d54; padding-bottom: .75rem; margin-bottom: 1.5rem; }
  h1 { font-size: 1.15rem; margin: 0; }
  .lead { color: #666; margin: .25rem 0 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  td, th { border-top: 1px solid #ddd; padding: .5rem 0; text-align: left; }
  th { color: #666; font-weight: 500; }
  td.v { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .big { font-size: 1.9rem; font-weight: 700; }
  footer { margin-top: 2rem; color: #999; font-size: 12px; }
</style></head>
<body>
  <header>
    <h1>État financier du ${label}</h1>
    <p class="lead">Archive automatique — ELYNDRA CAISSE</p>
  </header>
  <table>
    <tr><th>Chiffre d'affaires</th><td class="v big">${formatFCFA(snapshot.revenue)}</td></tr>
    <tr><th>Bénéfice (coût figé à la vente)</th><td class="v big">${formatFCFA(snapshot.profit)}</td></tr>
    <tr><th>Ventes</th><td class="v">${snapshot.salesCount}</td></tr>
    <tr><th>Panier moyen</th><td class="v">${formatFCFA(snapshot.averageBasket)}</td></tr>
  </table>
  <footer>Snapshot créé le ${intro}.</footer>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) {
    pdfFallback(html, `etat-financier-${label.replace(/\s+/g, "-")}.html`);
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
