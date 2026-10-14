// Regroupement des lignes de vente par catégorie, pour l'onglet Données.
//
// FONCTION PURE, ici et pas dans le composant : deux Maps imbriquées et deux tris sont
// exactement le code qu'on ne veut pas relire dans un JSX, et surtout le seul qu'on peut
// tester sans navigateur ni base.

import { lineCategory } from "@/lib/analytics";
import type { SaleItem } from "@/lib/db";

/** Une ligne regroupée. `key` = `product_id ?? name` (cf. `computePeriodStats`),
 *  `label` = nom FIGÉ au moment de la vente. */
export interface GroupedLine {
  key: string;
  label: string;
  quantity: number;
  total: number;
}

export interface CategoryGroup {
  category: string;
  total: number;
  lines: GroupedLine[];
}

/**
 * Regroupe les lignes par catégorie, puis par produit, en cumulant les quantités.
 *
 * La clé de produit est `product_id ?? name` — la même que `computePeriodStats`, donc
 * le même découpage que « Top produits » affiché sur la même page. Un produit renommé
 * reste sur UNE ligne : c'est `product_id`, stable, qui sert de clé. Grouper par le nom
 * figé produirait deux lignes « Eau » là où Top produits n'en montre qu'une.
 *
 * `lineCategory` fournit le repli « Autre » des ventes antérieures au suivi de la
 * catégorie — encore une fois, la même fonction que les rapports.
 *
 * Tri : catégories par montant décroissant (ce qui pèse d'abord), lignes d'une
 * catégorie par quantité décroissante (ce qui se vend le plus).
 */
export function groupByCategory(items: SaleItem[]): CategoryGroup[] {
  const byCategory = new Map<string, Map<string, GroupedLine>>();

  for (const item of items) {
    const category = lineCategory(item);
    const key = item.product_id ?? item.name;
    let lines = byCategory.get(category);
    if (!lines) {
      lines = new Map();
      byCategory.set(category, lines);
    }
    const existing = lines.get(key);
    const total = item.price_at_sale * item.quantity;
    if (existing) {
      existing.quantity += item.quantity;
      existing.total += total;
    } else {
      lines.set(key, { key, label: item.name, quantity: item.quantity, total });
    }
  }

  return [...byCategory.entries()]
    .map(([category, lines]) => ({
      category,
      total: [...lines.values()].reduce((sum, line) => sum + line.total, 0),
      lines: [...lines.values()].sort((a, b) => b.quantity - a.quantity),
    }))
    .sort((a, b) => b.total - a.total);
}
