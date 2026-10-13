// Application d'opérations distantes — le miroir d'`ops.ts`.
//
// Contrat d'idempotence : chaque op appliquée est côtée dans `processed_ops` dans la MÊME
// transaction que ses écritures métier. Rejouer une op déjà consumée est un no-op, et un
// rejet de transaction à mi-chemin ne laisse aucune trace partielle — pas de vente sans
// son op, pas d'op sans ses écritures.
//
// Ordre d'application : tri GLOBAL déterministe (created_at, device_id, seq). Tous les
// appareils trient de la même façon → même chemin d'exécution → mêmes résultats. Les
// deltas de stock sont de toute façon commutatifs, l'ordre ne compte qu'aux champs
// « dernier écrit gagne » (produits, clients).
//
// Ne JAMAIS passer par les fonctions publiques de db.ts ici : elles re-émettraient des
// ops. Application directe sur les stores, sous le seul contrôle de `processed_ops`.
//
// (orchestrate.ts) `applyRemoteOps` — transaction et bookkeeping des pairs ; (trust.ts)
// résolution des clés et vérification de signature ; (dispatch.ts) aiguillage ;
// (products.ts / sales.ts / clients.ts / devices.ts / catalogue.ts) handlers par entité ;
// (helpers.ts) `touch` et comparaison de variantes.
export { applyRemoteOps } from "./orchestrate";
