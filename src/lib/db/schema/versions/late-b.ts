import type Dexie from "dexie";

export function applyLateBVersions(db: Dexie): void {
  // Version 23 — UNIFICATION DES UNITÉS. `unitType` + `weightUnit` + `unit` (trois
  // champs pour une seule information) deviennent `unit`, qui gagne la valeur "kg".
  //
  // Règle de migration, dans cet ordre :
  //  - un produit déjà `weight` → "kg" (C'EST LE POIDS QUI PASSE, pas le
  //    conditionnement) ;
  //  - sinon on CONSERVE l'unité de vente existante (meter/liter), qu'un produit
  //    au poids pouvait porter pour un cylindre, une étagère, etc. ;
  //  - sinon "piece".
  // `weightUnit` est SUPPRIMÉ sans être migré : sa seule valeur écrite dans tout le
  // dépôt était "kg", déjà portée par `unitType === "weight"`. Le migrer créerait un
  // doublon, pas une information.
  //
  // AUCUN `updated_at` n'est touché : les produits modifiés ici sont des FICHES, pas
  // des ventes. Les toucher ferait remonter tout le catalogue en synchronisation P2P
  // pour un simple changement d'orthographe.
  db.version(23)
    .stores({
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
    })
    .upgrade(async (tx) => {
      await tx
        .table("products")
        .toCollection()
        .modify((p) => {
          const legacy = p as {
            unitType?: "unit" | "weight";
            weightUnit?: string;
            unit?: string;
          };
          if (legacy.unitType === "weight") legacy.unit ??= "kg";
          else if (!legacy.unit) legacy.unit = "piece";
          delete legacy.unitType;
          delete legacy.weightUnit;
        });
    });

  // Version 24 — SUPPRESSION DE `Product.expiryDate`.
  //
  // Décision produit (PRD v2.0 §7) : la date de péremption sort du formulaire. Elle
  // était saisie depuis la v10 et n'a jamais été LUE : aucun rapport, aucune alerte,
  // aucun export ne la consommait — `alerts.ts` ne mentionne pas la péremption, et le
  // champ n'avait pour seul lecteur que le formulaire qui l'affichait. Un champ de
  // suivi qui ne déclenche aucun suivi.
  //
  // La purge est PHYSIQUE ici, et c'est délibéré : `delete` fait disparaître la clé
  // du produit. Une péremption n'est pas du chiffre d'affaires — elle ne rentre dans
  // aucune vente, aucun bénéfice, aucun export. La garder en `undefined`-costant
  // laisserait un champ mort que le prochain lecteur croira encore alimenté.
  //
  // AUCUN `updated_at` touché : même raison qu'en v23 — ce sont des fiches, pas des
  // ventes. Les toucher ferait refluer tout le catalogue en synchronisation P2P chez
  // chaque commerçant pour une suppression de donnée qui ne vaut rien.
  //
  // ATTENTION — `expiryDate` SURVIT sur d'autres tables : `ShopProfile.expiryDate`
  // porte la date d'expiration de l'ABONNEMENT (trial, grace, `setShopExpiry`, et
  // `use-subscription.ts` qui affiche le bandeau). Ce champ n'a rien à voir avec la
  // péremption d'un produit ; la migration ne le touche pas.
  db.version(24)
    .stores({
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
    })
    .upgrade(async (tx) => {
      await tx
        .table("products")
        .toCollection()
        .modify((p) => {
          delete (p as { expiryDate?: number }).expiryDate;
        });
    });

  // Version 25 — SUPPRESSION DE LA LOCATION D'ACTIFS.
  //
  // Décision produit : le cluster 'location' disparaît. Le store `rentals` est purement
  // abandonné — `null` le retire de Dexie (ses enregistrements avec). Aucun upgrade :
  // il n'y a rien à reprendre, la location n'alimentait ni ventes, ni bénéfices.
  //
  // On ne touche PAS aux blocs de versions antérieures (une install neuve doit rejouer
  // l'historique exact) ; c'est cette version terminale qui fait foi.
  db.version(25).stores({
    rentals: null,
  });

  // Version 26 — CHARGES.
  //
  // Store neuf, aucun `upgrade()` : il n'y a rien à reprendre (même raison que les trois
  // stores de la version 18). `charges` porte les charges de service (rattachées à une
  // catégorie) et les charges d'exploitation, saisies sur une période.
  //
  // Index : `id, kind, period_start` — la seule lecture du moteur est « toutes les
  // charges de cette période », le filtrage par `kind` se fait ensuite en mémoire sur
  // quelques lignes. Un index composé `[kind+period_start]` ne servirait à rien tant
  // qu'aucune lecture ne demande un seul `kind` seul.
  db.version(26).stores({
    charges: "id, kind, period_start",
  });

  // Version 27 — ARCHIVES FINANCIÈRES AUTOMATIQUES.
  //
  // Store neuf, aucun `upgrade()` : rien à reprendre. `financial_snapshots` porte une
  // image figée (CA, bénéfice, ventes) d'une journée écoulée, émise automatiquement à
  // la fréquence choisie (`Preferences.snapshotFrequency`). Journal LOCAL : c'est
  // l'historique de CET appareil — hors synchronisation, exclue du snapshot de
  // sauvegarde (raison documentée dans snapshot-exhaustivity.test.ts). Le PDF est le
  // canal d'export (cf. lib/financial/archives.ts).
  //
  // Index : `id, created_at` — la lecture dialog est « tous les snapshots, du plus
  // récent au plus ancien », c'est `created_at` qui la porte.
  db.version(27).stores({
    financial_snapshots: "id, created_at",
  });
}
