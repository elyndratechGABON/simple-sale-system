import { getDB } from "./db";

export interface Reminder {
  id: string;
  productId: string;
  returnDate: number;
  notified?: boolean;
}

export async function fetchReminders(): Promise<Reminder[]> {
  try {
    const products = await getDB()
      .products.filter(
        (p: { is_asset?: boolean; return_date?: number }) =>
          Boolean(p.is_asset) && Boolean(p.return_date) && p.return_date! > Date.now() - 86400000,
      )
      .toArray();
    return products.map((p: { id: string; return_date?: number }) => ({
      id: p.id,
      productId: p.id,
      returnDate: p.return_date!,
    }));
  } catch {
    return [];
  }
}
