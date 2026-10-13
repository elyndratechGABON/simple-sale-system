import type Dexie from "dexie";

export function applyMiddleVersions(db: Dexie): void {
  // Version 12 — registre clients (cluster service) + index `client_id` sur les ventes.
  // Le store `clients` est neuf, rien à migrer. L'index `client_id` sur `sales` ne
  // crée pas d'index pour les ventes existantes qui n'ont pas ce champ (Dexie ignore
  // les clés absentes), ce qui est exact.
  db.version(12).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, client_id, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",

    clients: "id, name, phone, updated_at",
  });

  // Version 13 — coûts d'acquisition saisis dans les rapports (par produit, par période).
  // Le store `product_expenses` est neuf, rien à migrer.
  db.version(13).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, client_id, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",

    clients: "id, name, phone, updated_at",
    product_expenses: "++id, product_id, period_from, [product_id+period_from]",
  });

  // Version 14 — champs pour le workflow restaurant simplifié et le cluster magasin :
  //  - `served_at` sur les ventes (table servie mais pas encore payée)
  //  - `serial_number` sur les lignes de vente (électronique)
  //  - `unit` sur les produits (quincaillerie : pièce, mètre, litre)
  // Aucun upgrade() : les enregistrements existants sans ces champs lus comme
  // `undefined`, ce qui est exact pour des champs optionnels.
  db.version(14).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, client_id, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",

    clients: "id, name, phone, updated_at",
    product_expenses: "++id, product_id, period_from, [product_id+period_from]",
  });

  // Version 15 — journal des mouvements de stock : pourquoi la quantité a changé
  // (réapprovisionnement, vente, tournée, annulation, correction). Journal LOCAL :
  // la synchronisation n'envoie que des agrégats et le catalogue reste local, un
  // mouvement n'a donc rien à faire sur un autre appareil. `min_stock` sur Product
  // est optionnel sans index — il ne nécessite ni store ni upgrade.
  db.version(15).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, client_id, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",

    clients: "id, name, phone, updated_at",
    product_expenses: "++id, product_id, period_from, [product_id+period_from]",
    stock_movements: "id, product_id, created_at, [product_id+created_at]",
  });

  // Version 16 — historique des clôtures : une trace par jour clôturé (CA + nombre
  // de ventes au moment de la clôture). `payment_method` et `discount` sur Sale sont
  // optionnels sans index — aucun upgrade nécessaire pour eux.
  db.version(16).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, client_id, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",

    clients: "id, name, phone, updated_at",
    product_expenses: "++id, product_id, period_from, [product_id+period_from]",
    stock_movements: "id, product_id, created_at, [product_id+created_at]",
    day_closures: "id, closed_at",
  });

  // Version 17 — location d'actifs (abandonnée en v25). Le store `rentals` était neuf,
  // rien à migrer. Il était indexé sur `asset_id`, `status`, `start_date` et
  // `expected_end_date` (calendrier). Bloc conservé tel quel : le schéma d'une install
  // neuve rejoue l'historique ; c'est `version(25)` qui retire le store.
  db.version(17).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, client_id, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",

    clients: "id, name, phone, updated_at",
    product_expenses: "++id, product_id, period_from, [product_id+period_from]",
    stock_movements: "id, product_id, created_at, [product_id+created_at]",
    day_closures: "id, closed_at",
    rentals: "id, asset_id, status, start_date, expected_end_date, updated_at",
  });
}
