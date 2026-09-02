# Sync entre appareils (sans backend propriétaire)

1. Vente / stock / produit modifié → `sync_ops` (IndexedDB local, transactionnelle avec l'opération).
2. `transport.ts` pousse vers le relais (`POST /api/v1/ops`, `VITE_ORCHESTRATOR_URL`).
3. Le relais stocke et redistribue — aveugle, jamais d'agrégation des lignes brutes.
4. Pair reçoit → `applyRemoteOps` applique → `processed_ops` déduplique.
5. Résultat : convergence entre caisses du même `shop_id`, même si le propriétaire voyage (connexion internet suffit, pas le même WiFi).

L'orchestrateur sert le handshake, quota, agrégats 7j — pas la sync des ventes entre pairs.
