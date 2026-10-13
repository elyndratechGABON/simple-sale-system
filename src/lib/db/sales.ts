import { ensureIdentity, getIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";
import { alive, clampPositiveInt, getDB, paid, startOfToday, touch, uid } from "./internal";
import { applyStockDelta } from "./stock-delta";
import type { CartLine, PaymentMethod, Sale, SaleItem } from "./types/sales";

// ---------- Sales ----------
export async function createSale(input: {
  lines: CartLine[];
  cash_given: number;
  customers_count?: number;
  client_name?: string;
  client_id?: string;
  payment_method?: PaymentMethod;
  /** Réduction en FCFA, bornée au sous-total. */
  discount?: number;
}): Promise<Sale> {
  await ensureIdentity();
  const db = getDB();
  const subtotal = input.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = Math.min(Math.max(0, Math.round(input.discount ?? 0)), subtotal);
  const total = subtotal - discount;
  const method: PaymentMethod = input.payment_method ?? "cash";
  // Hors espèces, le montant débité est exact : rien ne rentre physiquement dans le
  // tiroir-caisse, il n'y a donc rien à rendre.
  const cashGiven = method === "cash" ? input.cash_given : total;
  // Garde défensive, miroir de `payTable`/`payRound` : un encaissement doit couvrir le
  // total. L'interface désactive déjà le bouton dans ce cas, mais une caisse offline ne
  // dépend pas que de l'interface — un `change_due` négatif serait un rendu impossible.
  if (cashGiven < total) throw new Error("Montant insuffisant.");
  // Qui encaisse : le rôle (employé) et le nom de l'appareil, pour le suivi
  // d'activité du propriétaire. Sur une caisse propriétaire, la vente reste à lui.
  const identity = getIdentity();
  const roleLabel = "Employé";
  const sellerLabel = identity.role === "owner" ? "" : identity.employeeName?.trim() || roleLabel;
  const sale: Sale = {
    id: uid(),
    timestamp: Date.now(),
    total,
    cash_given: cashGiven,
    change_due: cashGiven - total,
    day_closed: false,
    customers_count: clampPositiveInt(input.customers_count ?? 1),
    // Explicite bien qu'omis : une vente directe est encaissée au moment où on la crée.
    status: "paid",
    ...(discount > 0 ? { discount } : {}),
    payment_method: method,
    ...(input.client_name ? { client_name: input.client_name } : {}),
    ...(input.client_id ? { client_id: input.client_id } : {}),
    ...(sellerLabel ? { seller_name: sellerLabel, seller_device_id: identity.deviceId } : {}),
    ...touch(),
  };
  const items: SaleItem[] = [];
  await db.transaction(
    "rw",
    [db.sales, db.sale_items, db.products, db.stock_movements, db.sync_ops, db.settings],
    async () => {
      await db.sales.put(sale);
      for (const line of input.lines) {
        const item: SaleItem = {
          id: uid(),
          sale_id: sale.id,
          product_id: line.product_id,
          name: line.name,
          quantity: line.quantity,
          price_at_sale: line.price,
          cost_at_sale: line.cost,
          category_at_sale: line.category,
          ...(line.variant ? { variant: line.variant } : {}),
          ...(line.variant_id ? { variant_id: line.variant_id } : {}),
          ...touch(),
        };
        await db.sale_items.put(item);
        items.push(item);
        if (!line.product_id) continue; // ligne libre : rien à décrémenter
        await applyStockDelta(db, line.product_id, -line.quantity, {
          variantId: line.variant_id,
          reason: "sale",
        });
      }
      // La vente ET ses lignes partent dans l'op : elles sont le chiffre d'affaires que
      // les pairs rejoueront à l'identique (prix, coûts et catégories figés).
      await emitOp(db, getIdentity(), {
        type: "sale.created",
        entity_id: sale.id,
        payload: { sale, items },
      });
    },
  );
  return sale;
}

/** Ventes ENCAISSÉES uniquement — cf. `paid()`. Les tables ouvertes n'en font pas partie. */
export async function listSales(from?: number, to?: number): Promise<Sale[]> {
  const db = getDB();
  const collection =
    from !== undefined && to !== undefined
      ? db.sales.where("timestamp").between(from, to, true, false)
      : db.sales.toCollection();
  const all = await collection.toArray();
  return paid(alive(all))
    .filter((s) => (from ? s.timestamp >= from : true) && (to ? s.timestamp < to : true))
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function listSalesToday(): Promise<Sale[]> {
  const start = startOfToday();
  return listSales(start, start + 86400000);
}

export async function getSaleItems(saleId: string): Promise<SaleItem[]> {
  return alive(await getDB().sale_items.where("sale_id").equals(saleId).toArray());
}

// Une seule requête indexée pour un lot de ventes — évite le N+1 des agrégations.
export async function getSaleItemsForSales(saleIds: string[]): Promise<SaleItem[]> {
  if (saleIds.length === 0) return [];
  return alive(await getDB().sale_items.where("sale_id").anyOf(saleIds).toArray());
}
