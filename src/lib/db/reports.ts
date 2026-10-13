import { getDB } from "./internal";
import type { MonthlyOverview, ProductExpense } from "./types/records";

// ---------- Coûts d'acquisition (rapports) ----------
/**
 * Enregistre ou met à jour le coût d'acquisition d'un produit pour une période donnée.
 * Upsert : si un enregistrement existe déjà pour (product_id, period_from), on le met
 * à jour ; sinon on en crée un nouveau.
 */
export async function saveProductExpense(
  productId: string,
  periodFrom: number,
  periodTo: number,
  cost: number,
): Promise<void> {
  const db = getDB();
  const existing = await db.product_expenses
    .where("[product_id+period_from]")
    .equals([productId, periodFrom])
    .first();
  if (existing) {
    await db.product_expenses.put({ ...existing, cost, period_to: periodTo });
  } else {
    await db.product_expenses.add({
      product_id: productId,
      period_from: periodFrom,
      period_to: periodTo,
      cost,
    });
  }
}

/** Récupère tous les coûts d'acquisition d'une période. */
export async function getProductExpenses(from: number, to: number): Promise<ProductExpense[]> {
  const db = getDB();
  return db.product_expenses.where("period_from").between(from, to, true, false).toArray();
}

// ---------- Bilans mensuels (calculateur de bénéfices) ----------
export async function getMonthlyOverview(month: string): Promise<MonthlyOverview | undefined> {
  return getDB().monthly_overviews.get(month);
}

export async function saveMonthlyOverview(
  month: string,
  fields: {
    charges?: number;
    stock_override?: number | null;
    cost_complement?: number | null;
  },
): Promise<void> {
  const db = getDB();
  const existing = await db.monthly_overviews.get(month);
  await db.monthly_overviews.put({
    id: month,
    charges: fields.charges ?? existing?.charges ?? 0,
    stock_override:
      fields.stock_override !== undefined
        ? fields.stock_override
        : (existing?.stock_override ?? null),
    cost_complement:
      fields.cost_complement !== undefined
        ? fields.cost_complement
        : (existing?.cost_complement ?? null),
    updated_at: Date.now(),
  });
}
