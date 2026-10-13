import type Dexie from "dexie";

export function applyLateAVersions(db: Dexie): void {
  // Version 18 — journal d'opérations du moteur de synchronisation P2P.
  //
  //  - `sync_ops` : les opérations locales en attente de transmission (outbox). Un
  //    appareil relit ses `pending`, un pair applique les siennes puis les ACK. Indexé
  //    sur `[device_id+seq]` : l'ordre d'émission d'un même appareil se relit d'une
  //    requête. `status` permet de ne ressortir que ce qui n'a pas été acquitté.
  //  - `processed_ops` : déduplication. Un id d'op déjà appliqué = une application de
  //    moins, quoi qu'il arrive (ré-envoi après ACK perdu, double transmission).
  //  - `paired_devices` : le registre des autres appareils du compte (post-pairing).
  //
  // Les trois stores sont neufs : aucun `upgrade()` nécessaire.
  db.version(18).stores({
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

    sync_ops: "id, shop_id, device_id, seq, [device_id+seq], status, created_at",
    processed_ops: "id",
    paired_devices: "id, updated_at, shop_id",
  });

  // Version 19 — bilans mensuels du calculateur de bénéfices (header).
  //
  // Un enregistrement par mois (« YYYY-MM ») : charges fixes saisies, valeur du
  // stock restant éventuellement ajustée, complément de coût. Données LOCALES,
  // comme `product_expenses` : elles ne font pas partie du moteur de synchronisation.
  db.version(19).stores({
    products: "id, name, category, updated_at",
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

    sync_ops: "id, shop_id, device_id, seq, [device_id+seq], status, created_at",
    processed_ops: "id",
    paired_devices: "id, updated_at, shop_id",

    monthly_overviews: "id, updated_at",
  });

  // Version 20 — clôtures d'employés importées par le propriétaire (QR de restitution).
  //
  // Un enregistrement par QR agrégé (restitution.ts). Données LOCALES du propriétaire,
  // comme `product_expenses` / `monthly_overviews` : elles ne font pas partie du moteur
  // de synchronisation. Indexées sur `imported_at` (histogramme) et `employee_device_id`
  // (regroupement par employé). Store neuf : aucun `upgrade()` nécessaire.
  db.version(20).stores({
    products: "id, name, category, updated_at",
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

    sync_ops: "id, shop_id, device_id, seq, [device_id+seq], status, created_at",
    processed_ops: "id",
    paired_devices: "id, updated_at, shop_id",

    monthly_overviews: "id, updated_at",

    closings: "id, imported_at, employee_device_id, period_from, updated_at",
  });

  // Version 21 — carnet d'expérience employé. Store neuf, aucun upgrade() : rien à
  // migrer. Indexé sur `employeeId` (lecture du carnet d'une personne) et sur
  // `[employeeId+startedAt]` (tri chronologique par personne). Table de la PERSONNE,
  // jamais effacée par `purgeAllData`/`resetDeviceIdentity` : c'est elle qui rend le
  // carnet visible après la suppression du compte.
  db.version(21).stores({
    products: "id, name, category, updated_at",
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

    sync_ops: "id, shop_id, device_id, seq, [device_id+seq], status, created_at",
    processed_ops: "id",
    paired_devices: "id, updated_at, shop_id",

    monthly_overviews: "id, updated_at",

    closings: "id, imported_at, employee_device_id, period_from, updated_at",

    employee_history: "id, employeeId, shopId, [employeeId+startedAt]",
  });

  // Version 22 — demandes de catalogue en attente de confirmation du propriétaire.
  // Quand un employé clique "Importer le stock du propriétaire", une op `catalogue.request`
  // est envoyée. Le propriétaire doit confirmer avant que le snapshot ne soit envoyé.
  // Ce store trace les demandes en attente : `status` = pending | confirmed | denied | expired.
  db.version(22).stores({
    products: "id, name, category, updated_at",
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

    sync_ops: "id, shop_id, device_id, seq, [device_id+seq], status, created_at",
    processed_ops: "id",
    paired_devices: "id, updated_at, shop_id",

    monthly_overviews: "id, updated_at",

    closings: "id, imported_at, employee_device_id, period_from, updated_at",

    employee_history: "id, employeeId, shopId, [employeeId+startedAt]",

    catalogue_requests:
      "id, shop_id, requester_id, status, created_at, confirmed_at, denied_at, snapshot_sent",
  });
}
