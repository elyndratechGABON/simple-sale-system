import type Dexie from "dexie";

export function applyEarlyVersions(db: Dexie): void {
  // Version 2 — deux comportements Dexie non évidents, tous deux VÉRIFIÉS sur une base
  // réellement créée par l'ancien code `idb` (4 produits / 7 ventes / 8 lignes intacts) :
  //
  //  1. Dexie stocke `version × 10` dans IndexedDB. `version(2)` ci-dessous donne une
  //     base IndexedDB en version 20. Ne pas s'en alarmer et ne pas « corriger ».
  //  2. Les index de l'ancienne base s'appelaient `by_timestamp` et `by_sale`. Dexie ne
  //     les renomme pas et n'en crée pas de doublons : il résout les index par keyPath,
  //     pas par nom. `where("timestamp")` et `where("sale_id")` fonctionnent donc
  //     directement sur les index hérités. Ne pas tenter de les renommer à la main.
  //
  // Une migration ne recrée jamais les enregistrements : les ventes déjà en base
  // survivent. Toute évolution future du schéma ajoute une `version(n+1)`, elle ne
  // modifie pas celle-ci.
  db.version(2).stores({
    products: "id, name, category",
    sales: "id, timestamp",
    sale_items: "id, sale_id",
    settings: "key",
  });

  // Version 3 — champs de synchronisation, store `expenses`, compteur de clients.
  // Les trois tiennent dans UNE migration à dessein : chaque `version(n)` supplémentaire
  // est une réouverture de la base sur le terrain, donc une occasion de plus de la
  // corrompre chez un utilisateur qui ferme l'onglet au mauvais moment.
  //
  // `updated_at` est indexé sur les quatre stores métier : c'est ce qui rendra un pull
  // incrémental possible (`where("updated_at").above(lastSync)`) sans re-migrer.
  // `deleted_at` ne l'est PAS : un index sur un champ presque toujours absent ne sert
  // qu'à filtrer ce qui est déjà rare, le filtre en mémoire de `alive()` suffit.
  db.version(3)
    .stores({
      products: "id, name, category, updated_at",
      sales: "id, timestamp, updated_at",
      sale_items: "id, sale_id, updated_at",
      expenses: "id, timestamp, category, updated_at",
      settings: "key",
    })
    .upgrade(async (tx) => {
      const now = Date.now();
      // Les ventes existantes datent leur `updated_at` de leur propre horodatage, pas
      // de l'instant de la migration : sinon une première synchronisation croirait que
      // tout l'historique vient d'être modifié et le repousserait en entier.
      await tx
        .table("sales")
        .toCollection()
        .modify((s) => {
          s.updated_at ??= s.timestamp ?? now;
          s.sync_status ??= "local";
          s.customers_count ??= 1;
        });
      // Les lignes de vente n'ont pas d'horodatage propre ; celui de leur vente n'est
      // pas lisible ici sans une jointure par ligne. `now` est acceptable : elles ne
      // sont jamais modifiées après création, elles seront poussées une seule fois.
      for (const name of ["products", "sale_items"]) {
        await tx
          .table(name)
          .toCollection()
          .modify((r) => {
            r.updated_at ??= now;
            r.sync_status ??= "local";
          });
      }
    });

  // Version 4 — additions ouvertes par table. SEUL changement : l'index `status` sur
  // `sales`, qui rend `listOpenTables()` possible en une requête indexée.
  //
  // AUCUN `upgrade()`, et c'est délibéré. Dexie n'indexe pas les enregistrements dont
  // la clé est absente : les ventes déjà en base, qui n'ont pas de `status`, restent
  // donc hors de `where("status").equals("open")` — exactement ce qu'il faut, elles ont
  // toutes été encaissées. Réécrire des milliers de ventes réelles pour y poser un
  // champ que la lecture sait déjà déduire (`status !== "open"`) serait un risque pris
  // pour rien. Même logique défensive que les `?? 0` / `?? 1` de ce fichier.
  db.version(4).stores({
    products: "id, name, category, updated_at",
    sales: "id, timestamp, status, updated_at",
    sale_items: "id, sale_id, updated_at",
    expenses: "id, timestamp, category, updated_at",
    settings: "key",
  });

  // Version 5 — suppression du module Dépenses (décision produit). Le store `expenses`
  // est DROPPÉ (`null`), pas vidé : plus rien ne doit le lire, l'écrire ni le sauvegarder.
  // Aucune donnée à préserver : les sorties d'argent ne sont pas rejouables.
  //
  // Les sauvegardes v1/v2 qui contenaient des dépenses restent restaurables — le champ
  // est ignoré à la restauration (cf. src/lib/exports/json.ts).
  db.version(5).stores({
    products: "id, name, category, updated_at",
    sales: "id, timestamp, status, updated_at",
    sale_items: "id, sale_id, updated_at",
    expenses: null,
    settings: "key",
  });

  // Version 6 — abonnements clients. UN SEUL nouveau store, indexé sur `id` (lecture
  // et suppression par clé) et `updated_at` (la clé du futur pull incrémental, comme
  // partout ailleurs). AUCUN upgrade() : c'est un store neuf, il n'y a rien à migrer.
  db.version(6).stores({
    products: "id, name, category, updated_at",
    sales: "id, timestamp, status, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
  });

  // Version 7 — profil boutique (inscription auprès de l'orchestrateur). UN SEUL
  // enregistrement par appareil, clé fixe « me » : un store dédié plutôt qu'une ligne
  // dans `settings`, car c'est de la donnée qui se synchronise — elle doit porter les
  // champs de synchronisation comme le reste.
  db.version(7).stores({
    products: "id, name, category, updated_at",
    sales: "id, timestamp, status, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",
  });

  // Version 8 — index barcode sur les produits pour le scan code-barres. Aucun
  // upgrade() : les produits existants n'ont pas de `barcode`, Dexie n'indexe pas
  // les enregistrements dont la clé est absente, et `findProductByBarcode` lit
  // via `where("barcode").equals()` — retourne simplement `undefined`.
  db.version(8).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",
  });

  // Version 9 — champ `client_name` sur les ventes pour les services (coiffeur, salon).
  // Aucun upgrade() : les ventes existantes n'ont pas de `client_name`, Dexie n'indexe
  // pas les enregistrements dont la clé est absente. Requête par nom via
  // `where("client_name").equals()` retournera simplement `undefined`.
  db.version(9).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",
  });

  // Version 10 — champs V2 sur les produits : unitType, weightUnit, expiryDate,
  // serialNumber. Prépare le terrain pour les clusters poids (boucherie), habillement
  // (variantes) et quincaillerie (numéros de série). Aucun upgrade() : les produits
  // existants n'ont pas ces champs, Dexie n'indexe pas les clés absentes, et la lecture
  // retourne `undefined` — exactement le comportement voulu pour des champs optionnels.
  db.version(10).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",
  });

  // Version 11 — type de produit (product/service).
  db.version(11).stores({
    products: "id, name, category, barcode, updated_at",
    sales: "id, timestamp, status, client_name, client_id, updated_at",
    sale_items: "id, sale_id, updated_at",
    settings: "key",
    subscriptions: "id, updated_at",
    shop_profiles: "id, updated_at",
  });
}
