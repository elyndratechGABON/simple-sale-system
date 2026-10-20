// Couche de persistance unique de l'application — Dexie (IndexedDB), 100 % navigateur.
//
// Invariants :
//  - C'est le SEUL module qui touche IndexedDB. Aucune route n'ouvre la base directement.
//  - Toute écriture qui touche plusieurs stores passe par une transaction atomique
//    (produit + vente + lignes) : une vente enregistrée sans ses lignes, ou dont le
//    stock n'a pas été décrémenté, corrompt silencieusement tous les rapports.
//  - Les montants sont des entiers FCFA.
//  - Les prix et coûts sont FIGÉS dans la ligne de vente (`price_at_sale`, `cost_at_sale`,
//    `category_at_sale`) : modifier une fiche produit ne doit jamais réécrire l'historique.
//  - Les suppressions sont LOGIQUES (`deleted_at`), jamais physiques — cf. « Champs de
//    synchronisation » plus bas. Toute lecture doit donc filtrer les enregistrements
//    supprimés ; c'est le rôle de `alive()`.
export * from "./types/sync";
export * from "./types/sales";
export * from "./types/records";
export * from "./types/shop";
export * from "./products";
export * from "./sales";
export * from "./sales-cancel";
export * from "./closing";
export * from "./tables";
export * from "./tables-order";
export * from "./reports";
export * from "./charges";
export * from "./snapshot";
export * from "./subscriptions";
export * from "./shop";
export * from "./closings";
export * from "./employees";
export * from "./catalogue";
export * from "./settings";
export * from "./clients";
export * from "./categories";
export { PosDatabase } from "./schema/database";
export { getDB, resetDBForTests } from "./internal";
export { addStock, removeStock, listStockMovements } from "./stock";
export { applyStockDelta } from "./stock-delta";
export { listLostStockAlerts } from "./stock-delta";
