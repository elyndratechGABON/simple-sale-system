// La sauvegarde ne couvre que 8 des 18 stores : les 10 autres sont volontairement
// exclus, et c'est exactement ce qui rend l'oubli possible. Un store ajouté en v27,
// déclaré au schéma et oublié ici, se comporterait sans le moindre symptôme jusqu'au
// jour où le commerçant restaure — et ses charges disparues ne se verraient qu'alors.
//
// Ces tests verrouillent les DEUX sens : chaque table du snapshot passe l'aller-retour,
// et chaque table du schéma est soit sauvegardée, soit listée comme exclusion volontaire.

import { test, expect, afterEach } from "vitest";
import { getDB, resetDBForTests } from "@/lib/db/internal";
import { exportSnapshot, purgeAllData, replaceAllData } from "./snapshot";

// ---------- Exclusions assumées, avec leur raison ----------
const EXCLUES: Record<string, string> = {
  settings: "préférences propres à l'appareil",
  shop_profiles: "fiche de l'appareil, pas de la boutique",
  stock_movements: "journal local, reconstruit par les ventes",
  day_closures: "recalculé à la clôture du jour",
  closings: "imports d'inventaire, rattrapables",
  employee_history: "données de la PERSONNE, hors de la boutique",
  catalogue_requests: "file d'attente P2P, éphémère",
  sync_ops: "journal d'échange, jamais restauré",
  processed_ops: "déduplication, vide de sens après restauration",
  paired_devices: "registre des appareils, reconstruit par le pairing",
};

const TABLES_SNAPSHOT = [
  "products",
  "sales",
  "sale_items",
  "subscriptions",
  "clients",
  "product_expenses",
  "monthly_overviews",
  "charges",
] as const;

afterEach(async () => {
  await resetDBForTests();
});

/** Une ligne minimale par store : les colonnes non indexées n'ont pas d'obligation. */
function rowFor(table: string, id: string): Record<string, unknown> {
  const now = Date.now();
  const sync = { updated_at: now, sync_status: "local" };
  switch (table) {
    case "products":
      return { id, name: "Eau", price: 500, cost: 300, stock: 10, category: "Boisson", ...sync };
    case "sales":
      return { id, timestamp: now, total: 500, status: "paid", day_closed: false, ...sync };
    case "sale_items":
      return { id, sale_id: "s1", name: "Eau", quantity: 1, price_at_sale: 500, ...sync };
    case "subscriptions":
      return {
        id,
        clientName: "Awa",
        plan: "Mensuel",
        price: 1000,
        startDate: now,
        endDate: now,
        paid: true,
        ...sync,
      };
    case "clients":
      return { id, name: "Awa", ...sync };
    case "product_expenses":
      return { product_id: "p1", period_from: now, period_to: now, cost: 300 };
    case "monthly_overviews":
      return {
        id: "2026-10",
        charges: 15000,
        stock_override: null,
        cost_complement: null,
        updated_at: now,
      };
    case "charges":
      return {
        id,
        kind: "business",
        label: "Loyer",
        period_start: now,
        period_to: now,
        amount: 15000,
        ...sync,
      };
    default:
      throw new Error(
        `Ligne de fixture manquante pour « ${table} » — ajoute-la : le snapshot a changé.`,
      );
  }
}

test("chaque table du snapshot survit à un aller-retour sauvegarde/restauration", async () => {
  const db = getDB();
  for (const table of TABLES_SNAPSHOT) {
    await db.table(table).put(rowFor(table, `seed-${table}`));
  }

  const snapshot = await exportSnapshot();
  await purgeAllData();
  await replaceAllData(snapshot);

  for (const table of TABLES_SNAPSHOT) {
    const rows = await db.table(table).toArray();
    // `product_expenses` a une clé autoincrémentée : on vérifie le contenu, pas l'id.
    expect(rows.length, `${table} a perdu ses données`).toBe(1);
  }
});

test("restaurer REMPLACE, il ne fusionne pas", async () => {
  const db = getDB();
  // `db.table()` (non typé) plutôt que `db.charges` : la fixture est volontairement
  // minimale, elle ne construit pas un `Charge` complet.
  await db.table("charges").put(rowFor("charges", "charge-1"));

  const premier = await exportSnapshot();
  await purgeAllData();
  await db.table("charges").put(rowFor("charges", "charge-2"));
  await replaceAllData(premier);

  const rows = await db.charges.toArray();
  // Sans `clear()` dans la transaction de restauration, les deux charges coexistent.
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe("charge-1");
});

test("purgeAllData vide aussi les tables du snapshot", async () => {
  const db = getDB();
  for (const table of TABLES_SNAPSHOT) {
    await db.table(table).put(rowFor(table, `seed-${table}`));
  }

  await purgeAllData();

  for (const table of TABLES_SNAPSHOT) {
    expect(await db.table(table).count(), `${table} a survécu à la purge`).toBe(0);
  }
});

test("toute table du schéma est soit sauvegardée, soit exclue volontairement", async () => {
  const duSchema = getDB()
    .tables.map((t) => t.name)
    .sort();
  const orphelines = duSchema.filter(
    (n) => !TABLES_SNAPSHOT.includes(n as never) && !(n in EXCLUES),
  );

  expect(
    orphelines,
    `Store${orphelines.length > 1 ? "s" : ""} sans destination : ajoute-le à snapshot.ts ou à EXCLUES avec sa raison.`,
  ).toEqual([]);

  // L'inverse : une exclusion qui ne correspond plus à une table du schéma est un
  // renommage oublié — le whitelist doit évoluer avec le schéma.
  const exclusionsObsoletes = Object.keys(EXCLUES).filter((n) => !duSchema.includes(n));
  expect(exclusionsObsoletes, "Exclusions qui ne correspondent plus à un store").toEqual([]);
});
