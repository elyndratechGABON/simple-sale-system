// Sauvegarde et restauration : dump COMPLET de la base, pas seulement la période
// affichée. C'est la copie de secours de l'application — un dump partiel serait un
// piège, puisque restaurer efface ce que le fichier ne contient pas.
//
// Le parsing/validation vit ici, l'écriture vit dans src/lib/db.ts : ce module ne touche
// jamais IndexedDB directement, c'est l'invariant de db.ts.
import { z } from "zod";
import { exportSnapshot, replaceAllData, type DatabaseSnapshot } from "../db";

// v1 : products / sales / sale_items, sans champs de synchronisation.
// v2 : ajoute le store `expenses`, les champs de synchronisation et `customers_count`.
// Les fichiers v1 restent lisibles — cf. les valeurs par défaut du schéma ci-dessous.
export const BACKUP_FORMAT_VERSION = 2;

export interface BackupFile extends DatabaseSnapshot {
  format: "caisse-pos-backup";
  version: number;
  exportedAt: string;
}

// Champs de synchronisation, absents des sauvegardes v1 : on leur donne des valeurs de
// repli plutôt que de rejeter le fichier. Un utilisateur qui restaure une vieille
// sauvegarde ne doit pas se heurter à une erreur de format.
const syncFields = {
  updated_at: z.number().optional(),
  deleted_at: z.number().optional(),
  sync_status: z.enum(["local", "synced"]).optional(),
};

const category = z.enum(["Boisson", "Snack", "Service", "Autre"]);

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().optional(),
  price: z.number(),
  // `stock` vaut Infinity pour un stock illimité, et JSON.stringify écrit `null` pour
  // Infinity. `nullable` n'est donc pas de la tolérance : c'est le cas nominal des
  // services. La reconversion se fait dans `normalize`.
  stock: z.number().nullable(),
  category,
  ...syncFields,
});

const saleSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  total: z.number(),
  cash_given: z.number(),
  change_due: z.number(),
  day_closed: z.boolean(),
  customers_count: z.number().optional(),
  ...syncFields,
});

const saleItemSchema = z.object({
  id: z.string(),
  sale_id: z.string(),
  product_id: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  price_at_sale: z.number(),
  cost_at_sale: z.number().optional(),
  category_at_sale: category.optional(),
  ...syncFields,
});

const expenseSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  label: z.string(),
  amount: z.number(),
  category: z.enum(["Achat", "Transport", "Salaire", "Loyer", "Autre"]),
  ...syncFields,
});

const backupSchema = z.object({
  format: z.literal("caisse-pos-backup"),
  version: z.number(),
  exportedAt: z.string().optional(),
  products: z.array(productSchema),
  sales: z.array(saleSchema),
  sale_items: z.array(saleItemSchema),
  expenses: z.array(expenseSchema).optional(), // absent des sauvegardes v1
});

export async function buildBackupBlob(): Promise<Blob> {
  const snapshot = await exportSnapshot();
  const backup: BackupFile = {
    format: "caisse-pos-backup",
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    ...snapshot,
  };
  return new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
}

export function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // Date locale : une sauvegarde faite le soir ne doit pas porter la date du lendemain.
  return `sauvegarde-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export interface BackupSummary {
  version: number;
  exportedAt?: string;
  products: number;
  sales: number;
  expenses: number;
}

/**
 * Valide un fichier et le convertit en snapshot prêt à écrire.
 * Lève une erreur en français si le fichier n'est pas une sauvegarde de cette
 * application — le message est affiché tel quel à l'utilisateur.
 */
export function parseBackup(text: string): { snapshot: DatabaseSnapshot; summary: BackupSummary } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Fichier illisible : ce n'est pas du JSON.");
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Ce fichier n'est pas une sauvegarde de cette application.");
  }
  const data = parsed.data;
  if (data.version > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Sauvegarde au format ${data.version}, trop récente pour cette version de l'application.`,
    );
  }

  const now = Date.now();
  // Une valeur de synchronisation manquante devient "local" : l'enregistrement restauré
  // n'a jamais été poussé du point de vue de CET appareil, ce qui est exact.
  const normalize = <T extends { updated_at?: number; sync_status?: "local" | "synced" }>(
    r: T,
    fallbackTimestamp?: number,
  ) => ({
    ...r,
    updated_at: r.updated_at ?? fallbackTimestamp ?? now,
    sync_status: r.sync_status ?? ("local" as const),
  });

  const snapshot: DatabaseSnapshot = {
    products: data.products.map((p) => ({
      ...normalize(p),
      cost: p.cost ?? 0,
      // `null` en JSON = Infinity à l'origine : stock illimité. Cf. productSchema.
      stock: p.stock === null ? Number.POSITIVE_INFINITY : p.stock,
    })),
    sales: data.sales.map((s) => ({
      ...normalize(s, s.timestamp),
      customers_count: s.customers_count ?? 1,
    })),
    sale_items: data.sale_items.map((i) => ({
      ...normalize(i),
      cost_at_sale: i.cost_at_sale ?? 0,
    })),
    expenses: (data.expenses ?? []).map((e) => normalize(e, e.timestamp)),
  };

  return {
    snapshot,
    summary: {
      version: data.version,
      exportedAt: data.exportedAt,
      products: snapshot.products.length,
      sales: snapshot.sales.length,
      expenses: snapshot.expenses.length,
    },
  };
}

/** Écrase les données métier par celles du fichier. Destructif — confirmer en amont. */
export async function restoreBackup(snapshot: DatabaseSnapshot): Promise<void> {
  await replaceAllData(snapshot);
}
