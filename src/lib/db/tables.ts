import { alive, getDB, touch, uid } from "./internal";
import { emitOp } from "../syncengine/ops";
import { getIdentity } from "../syncengine/identity";
import type { Sale } from "./types/sales";
import type { TableOpenedPayload } from "../syncengine/types";

// ---------- Tables (additions ouvertes) ----------
//
// Une addition de table est une `Sale` de statut "open" : même enregistrement, mêmes
// lignes, même annulation. Rien de nouveau en base, donc rien de nouveau à sauvegarder,
// à restaurer ou à synchroniser plus tard — et `cancelSale` fonctionne dessus telle
// quelle. Le prix de ce choix est le filtre `paid()`, qui doit rester posé sur toute
// lecture de ventes.
//
// Le stock part à la COMMANDE et non au paiement : la bouteille a quitté le frigo au
// moment de la tournée. C'est ce qui rend l'avertissement « stock insuffisant » utile
// pendant le service, et non deux heures trop tard.

/** Additions en cours, de la plus ancienne à la plus récente — l'ordre du service. */
export async function listOpenTables(): Promise<Sale[]> {
  const rows = await getDB().sales.where("status").equals("open").toArray();
  return alive(rows).sort((a, b) => (a.opened_at ?? a.timestamp) - (b.opened_at ?? b.timestamp));
}

export async function openTable(label: string, clientName?: string): Promise<Sale> {
  const now = Date.now();
  const sale: Sale = {
    id: uid(),
    // Provisoire : réécrit par `payTable`. Tant que la table est ouverte, cette date ne
    // sert qu'à trier — aucune lecture de chiffre d'affaires ne la voit, `paid()` filtre.
    timestamp: now,
    opened_at: now,
    total: 0,
    cash_given: 0,
    change_due: 0,
    day_closed: false,
    // Une table compte pour UN client, sans jamais demander combien de personnes s'y
    // assoient : le service n'a pas à compter des couverts pour encaisser. Le KPI
    // « clients » ne se renseigne donc plus qu'au comptoir.
    customers_count: 1,
    table: label,
    status: "open",
    ...(clientName ? { client_name: clientName } : {}),
    ...touch(),
  };
  const db = getDB();
  // Produit + op dans UNE transaction : l'addition est là, l'annonce EST PARTIE — ou
  // ni l'un ni l'autre. Pas de fiche "ouvert" sans son op P2P `table.opened` chez les
  // pairs (deux serveurs viseraient la même table sans le savoir).
  await db.transaction("rw", db.sales, db.sync_ops, db.settings, async () => {
    await db.sales.put(sale);
    const payload: TableOpenedPayload = { label, sale };
    await emitOp(db, getIdentity(), {
      type: "table.opened",
      entity_id: sale.id,
      payload,
    });
  });
  return sale;
}

/**
 * Renomme une table OUVERTE. Le libellé vit sur la `Sale` (`table`), donc il suit
 * l'addition jusqu'à l'encaissement, la facture et l'historique — sans table de
 * correspondance à maintenir.
 *
 * Le préfixe « Table » est retiré : tous les écrans l'ajoutent eux-mêmes à l'affichage.
 * Refusé si l'addition est réglée : un ticket encaissé ne se réécrit pas.
 */
export async function renameTable(saleId: string, label: string): Promise<Sale> {
  const db = getDB();
  const sale = await db.sales.get(saleId);
  if (!sale || sale.deleted_at) throw new Error("Table introuvable.");
  if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");
  const name = label
    .trim()
    .replace(/^table\s+/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 40);
  if (!name) throw new Error("Le nom de la table ne peut pas être vide.");
  const updated: Sale = { ...sale, table: name, ...touch() };
  await db.sales.put(updated);
  return updated;
}

/**
 * Libère une table ouverte sur laquelle rien n'a encore été servi.
 *
 * Une table s'ouvre d'un tap et se libère d'un appui long : c'est le geste inverse, pas
 * une annulation, et il sert au cas le plus banal du service — la table ouverte par
 * erreur, ou les clients partis avant de commander.
 *
 * La garde sur les lignes est le tout : dès qu'une tournée est passée, du stock est sorti
 * et de l'argent est dû. Ce cas-là reste « Annuler la table », avec son code PIN et sa
 * restauration de stock (`cancelSale`) — un appui long ne doit jamais pouvoir effacer une
 * addition servie.
 */
export async function closeTable(saleId: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.sales, db.sale_items, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.deleted_at) return;
    if (sale.status !== "open") throw new Error("Cette addition est déjà réglée.");
    const items = alive(await db.sale_items.where("sale_id").equals(saleId).toArray());
    if (items.length > 0) {
      throw new Error("Des articles ont déjà été servis : utilisez « Annuler la table ».");
    }
    await db.sales.put({ ...sale, ...touch(), deleted_at: Date.now() });
  });
}

/**
 * Passe une commande en « préparation » (restaurant) : la table quitte l'état
 * « à préparer », la cuisine prend la commande en main.
 */
export async function prepareTable(saleId: string): Promise<void> {
  const db = getDB();
  const sale = await db.sales.get(saleId);
  if (!sale || sale.deleted_at) return;
  if (sale.status !== "open") return;
  await db.sales.put({ ...sale, preparing_at: Date.now(), ...touch() });
}

/**
 * Marque une commande « prête » (restaurant) : la cuisine a terminé, rien ne manque
 * plus pour la servir. `served_at` reste à poser par `serveTable`.
 */
export async function readyTable(saleId: string): Promise<void> {
  const db = getDB();
  const sale = await db.sales.get(saleId);
  if (!sale || sale.deleted_at) return;
  if (sale.status !== "open") return;
  await db.sales.put({ ...sale, ready_at: Date.now(), ...touch() });
}

/**
 * Marque une table comme servie (restaurant) : la commande est prête, le paiement est
 * débloqué. Identifie le moment où le plat a quitté la cuisine — c'est la clé du workflow
 * simplifié (pending → served → paid).
 */
export async function serveTable(saleId: string): Promise<void> {
  const db = getDB();
  const sale = await db.sales.get(saleId);
  if (!sale || sale.deleted_at) return;
  if (sale.status !== "open") return;
  await db.sales.put({ ...sale, served_at: Date.now(), ...touch() });
}
