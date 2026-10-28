import { ensureIdentity, getIdentity } from "../syncengine/identity";
import { emitOp } from "../syncengine/ops";
import { alive, getDB, touch, uid } from "./internal";
import { applyStockDelta } from "./stock-delta";
import type { CartLine, Sale } from "./types/sales";

/**
 * Ajoute une tournée à une addition ouverte.
 *
 * Une seule transaction pour les lignes, le stock et le total : une tournée enregistrée
 * sans son décrément de stock, ou un total qui ne suit pas ses lignes, se verrait à
 * l'addition et il serait trop tard pour savoir quoi corriger.
 */
export async function addRound(saleId: string, lines: CartLine[]): Promise<Sale> {
  const db = getDB();
  const ordered_at = Date.now();
  return db.transaction(
    "rw",
    [db.sales, db.sale_items, db.products, db.stock_movements, db.sync_ops, db.settings],
    async () => {
      const sale = await db.sales.get(saleId);
      if (!sale || sale.deleted_at) throw new Error("Table introuvable.");
      if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");

      for (const line of lines) {
        await db.sale_items.put({
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
          ordered_at,
          ...touch(),
        });
        if (!line.product_id) continue; // ligne libre : rien à décrémenter
        await applyStockDelta(db, line.product_id, -line.quantity, {
          variantId: line.variant_id,
          reason: "round",
        });
      }

      // Le total se RECALCULE depuis les lignes vivantes plutôt que de s'incrémenter : une
      // addition dont le total dérive de ses lignes ne peut pas mentir, même si une tournée
      // a été écrite deux fois.
      const items = alive(await db.sale_items.where("sale_id").equals(sale.id).toArray());
      const total = items.reduce((s, i) => s + i.price_at_sale * i.quantity, 0);
      const updated: Sale = { ...sale, total, ...touch() };
      await db.sales.put(updated);
      return updated;
    },
  );
}

/** Encaisse une addition : elle devient une vente ordinaire, datée de cet instant. */
export async function payTable(saleId: string, cashGiven: number): Promise<Sale> {
  await ensureIdentity();
  const db = getDB();
  return db.transaction("rw", db.sales, db.sale_items, db.sync_ops, db.settings, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) throw new Error("Table introuvable.");
    if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");

    const items = alive(await db.sale_items.where("sale_id").equals(sale.id).toArray());
    if (items.length === 0) throw new Error("Addition vide, rien à encaisser.");
    const total = items.reduce((s, i) => s + i.price_at_sale * i.quantity, 0);
    if (cashGiven < total) throw new Error("Montant insuffisant.");

    const now = Date.now();
    const identity = getIdentity();
    // QUI encaisse : la vente d'une table doit remonter sous l'écran qui a encaissé
    // (« Équipe » : le CA par employé, comme un comptoir). Sans ces champs, la vente
    // était orpheline pour l'employé — le patron la voyait, lui non.
    const sellerLabel = identity.role === "owner" ? "" : identity.employeeName?.trim() || "Employé";
    const settled: Sale = {
      ...sale,
      status: "paid",
      // La vente est datée de l'ENCAISSEMENT, pas de l'ouverture : c'est aujourd'hui que
      // l'argent est entré, et c'est aujourd'hui que les rapports doivent le voir.
      timestamp: now,
      total,
      cash_given: cashGiven,
      change_due: cashGiven - total,
      ...(sellerLabel
        ? { seller_name: sellerLabel, seller_device_id: identity.deviceId }
        : {}),
      ...touch(),
    };
    await db.sales.put(settled);
    // L'encaissement d'une table, c'est du chiffre d'affaires : la vente réglée et ses
    // lignes partent dans une `sale.created` comme n'importe quelle vente au comptoir.
    // Le stock, sorti à la COMMANDE sur la caisse émettrice (`addRound`), est décrémenté
    // au rejeu chez les pairs (miroir de `sale.created`) : les deux machines convergent
    // sur le même stock final. Annulée ensuite, `cancelSale` restaure des deux côtés.
    await emitOp(db, getIdentity(), {
      type: "sale.created",
      entity_id: settled.id,
      payload: { sale: settled, items },
    });
    return settled;
  });
}

/**
 * Encaisse UNE TOURNÉE d'une addition ouverte, sans clore la table.
 *
 * La tournée est identifiée par son `ordered_at` — l'heure de commande que `addRound`
 * pose sur toutes ses lignes. L'encaissement DÉPLACE ces lignes vers une vente `paid`
 * à part entière plutôt que de les marquer : les rapports, l'historique et les exports
 * ne lisent le chiffre d'affaires qu'au travers de `listSales()` (filtre `paid()`), et
 * une table reste `"open"` tant qu'elle peut encore recevoir une tournée. Déplacer les
 * lignes vers une vente réglée les fait donc compter à l'instant où l'argent entre,
 * sans percer l'invariant « une addition ouverte n'est pas du CA » dans les rapports.
 *
 * Le stock, lui, est déjà sorti à la COMMANDE (`addRound`) : aucun décrément ici.
 * L'annulation de la vente sortie (`cancelSale`) restaure — comme pour n'importe quelle
 * vente. `closeTable` reste le geste inverse d'`openTable`, il n'est pas affecté.
 */
export async function payRound(
  saleId: string,
  orderedAt: number,
  cashGiven: number,
): Promise<Sale> {
  await ensureIdentity();
  const db = getDB();
  return db.transaction("rw", db.sales, db.sale_items, db.sync_ops, db.settings, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) throw new Error("Table introuvable.");
    if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");

    const roundItems = alive(await db.sale_items.where("sale_id").equals(saleId).toArray()).filter(
      (i) => i.ordered_at === orderedAt,
    );
    if (roundItems.length === 0) throw new Error("Tournée introuvable.");

    const roundTotal = roundItems.reduce((s, i) => s + i.price_at_sale * i.quantity, 0);
    if (cashGiven < roundTotal) throw new Error("Montant insuffisant.");

    const now = Date.now();
    const identity = getIdentity();
    // QUI encaisse la tournée : attribue la vente à l'écran qui encaisse (« Équipe »).
    const sellerLabel = identity.role === "owner" ? "" : identity.employeeName?.trim() || "Employé";
    const settled: Sale = {
      id: uid(),
      timestamp: now,
      total: roundTotal,
      cash_given: cashGiven,
      change_due: cashGiven - roundTotal,
      day_closed: false,
      // Chaque encaissement est une transaction comme une vente au comptoir : il compte
      // pour un client. Le compteur reste volontairement simple, cf. `openTable`.
      customers_count: 1,
      table: sale.table,
      status: "paid",
      ...(sellerLabel
        ? { seller_name: sellerLabel, seller_device_id: identity.deviceId }
        : {}),
      ...touch(),
    };
    await db.sales.put(settled);

    for (const item of roundItems) {
      await db.sale_items.put({ ...item, sale_id: settled.id, ...touch() });
    }

    // Vente réglée, lignes déplacées : la tournée part dans une `sale.created`. Le stock
    // sorti à la commande sur l'émetteur est décrémenté au rejeu chez les pairs, qui
    // convergent ainsi sur le même stock — annuler la tournée plus tard (`cancelSale`)
    // restaure des deux côtés.
    await emitOp(db, getIdentity(), {
      type: "sale.created",
      entity_id: settled.id,
      payload: { sale: settled, items: roundItems },
    });

    // Le total de la table se recalcule sur ce qui n'a pas encore été encaissé : une
    // tournée payée sort de l'addition, la suite du service repart de ce qui reste dû.
    const remaining = alive(await db.sale_items.where("sale_id").equals(saleId).toArray());
    await db.sales.put({
      ...sale,
      total: remaining.reduce((s, i) => s + i.price_at_sale * i.quantity, 0),
      // La table a maintenant déjà encaissé au moins une tournée : le plan de salle la
      // distingue d'une table servie mais rien payée.
      rounds_paid: (sale.rounds_paid ?? 0) + 1,
      ...touch(),
    });

    return settled;
  });
}
