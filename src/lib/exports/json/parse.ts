import { exportSnapshot, replaceAllData, type DatabaseSnapshot } from "../../db";
import { BACKUP_FORMAT_VERSION, backupSchema, type BackupFile, type BackupSummary } from "./schema";

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
      // Repli V23 : une sauvegarde écrite avant l'unification porte `unitType: "weight"`.
      // Sans ce report, elle se restaurerait en produit à l'unité — la boucherie
      // retrouverait ses produits au prix du kilo, vendus à l'unité. Mêmes règles que
      // la migration Dexie : le poids l'emporte, sinon l'unité existante est conservée.
      unit: p.unit ?? (p.unitType === "weight" ? "kg" : "piece"),
    })),
    sales: data.sales.map((s) => ({
      ...normalize(s, s.timestamp),
      customers_count: s.customers_count ?? 1,
    })),
    sale_items: data.sale_items.map((i) => ({
      ...normalize(i),
      cost_at_sale: i.cost_at_sale ?? 0,
    })),
    subscriptions: (data.subscriptions ?? []).map((s) => normalize(s)),
    product_expenses: (data.product_expenses ?? []).map((e) => ({
      ...normalize(e),
      cost: e.cost ?? 0,
    })),
    clients: (data.clients ?? []).map((c) => normalize(c)),
    monthly_overviews: (data.monthly_overviews ?? []).map((m) => ({
      ...m,
      updated_at: m.updated_at ?? now,
    })),
  };

  return {
    snapshot,
    summary: {
      version: data.version,
      exportedAt: data.exportedAt,
      products: snapshot.products.length,
      sales: snapshot.sales.length,
      subscriptions: snapshot.subscriptions.length,
      productExpenses: snapshot.product_expenses?.length ?? 0,
    },
  };
}

/** Écrase les données métier par celles du fichier. Destructif — confirmer en amont. */
export async function restoreBackup(snapshot: DatabaseSnapshot): Promise<void> {
  await replaceAllData(snapshot);
}
