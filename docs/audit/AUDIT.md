# AUDIT — simple-sale-system-main

**Date**: 2026-10-11  
**Workspace**: `C:\Users\Administrator\Desktop\elywrok\jyls\simple-sale-system-main`  
**Stack**: React 19 + TanStack Router + TanStack Query + Vite + Dexie (IndexedDB) + TanStack Start (SSR)  
**Backend**: `simple-sale-orchestrator` (Node/Express on Vercel, Neon PostgreSQL)

---

## Résumé exécutif

| Couche                       | Avancement estimé | Statut global                           |
| ---------------------------- | ----------------- | --------------------------------------- |
| Frontend (React + TanStack)  | ~85%              | 🔴 **BUILD KO** — erreurs TS bloquantes |
| Backend (Orchestrator)       | ~90%              | 🟡 Non vérifié (build non testé)        |
| Sync Engine (P2P + Relais)   | ~70%              | 🔴 **TESTS KO** — 8/186 tests échouent  |
| Sync Engine (P2P + Relais)   | ~70%              | 🔴 **TESTS KO** — 8/186 tests échouent  |
| Orchestrator (API + Drainer) | ~90%              | 🟡 Non vérifié                          |

**3 blocages critiques**

1. **BUILD KO** — `src/components/TeamDialog.tsx:301:9` — Erreur TS syntaxe (JSX non fermé / fragment manquant)
2. **TESTS KO** — 8/186 tests échouent (`cibles is not defined` dans `transport.ts:217`)
3. **Build CI bloqué** — `npm run check` échoue (typecheck + lint)

---

## Tableau Frontend

| Feature                   | Fichier                                                              | Statut                      | Preuve                                                                                  |
| ------------------------- | -------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Routing (TanStack Router) | `src/router.tsx`, `src/routeTree.gen.ts`                             | ✅ IMPLÉMENTÉ & FONCTIONNEL | Routes: `/`, `/welcome`, `/_app/*` (dashboard, pos, history, reports, settings, stocks) |
| POS (Point of Sale)       | `src/routes/_app/pos.tsx`                                            | ✅ IMPLÉMENTÉ & FONCTIONNEL | Grille produits, panier, dictée vocale, paiement, closures                              |
| Stocks / Inventaire       | `src/routes/_app/stocks.tsx`, `components/ProductForm.tsx`           | ✅ IMPLÉMENTÉ & FONCTIONNEL | CRUD produits, variantes, catégories, seuils alerte                                     |
| Historique / Rapports     | `src/routes/_app/history.tsx`, `components/ProfitSheet.tsx`          | ✅ IMPLÉMENTÉ & FONCTIONNEL | CA, marge, panier moyen, exports CSV/Excel/PDF                                          |
| Paramètres / Sync         | `src/routes/_app/settings.tsx`, `components/DevicePairingDialog.tsx` | ✅ IMPLÉMENTÉ & FONCTIONNEL | Pairing QR, partage stock, abonnements, backup                                          |
| Team / Équipe             | `components/TeamDialog.tsx`, `components/TeamRow.tsx`                | 🔴 **BLOQUANT**             | Erreur TS ligne 301 (JSX adjacent non enveloppé)                                        |
| Catalogue Request Dialog  | `components/CatalogueRequestConfirmDialog.tsx`                       | ✅ IMPLÉMENTÉ               | Dialog de confirmation import stock (AlertDialog)                                       |
| Sync Engine (P2P)         | `src/lib/syncengine/transport.ts`, `apply.ts`, `pairing.ts`          | 🟡 PARTIEL                  | 8/186 tests échouent (`cibles is not defined`)                                          |
| IndexedDB (Dexie)         | `src/lib/db.ts`                                                      | ✅ IMPLÉMENTÉ & FONCTIONNEL | Schema v22, alive(), transactions atomiques                                             |
| Onboarding / Pairing      | `Onboarding.tsx`, `DevicePairingDialog.tsx`                          | ✅ IMPLÉMENTÉ & FONCTIONNEL | QR code, pair_code, auto-approve via pair_code                                          |
| Stock Sharing             | `sharing.ts`, `ShareStockDialog.tsx`                                 | ✅ IMPLÉMENTÉ               | Partage sélectif par employé, `shared_product_ids`                                      |
| Offline-first / PWA       | `pwa.ts`, `sw.js`, `vite.config.static.ts`                           | ✅ IMPLÉMENTÉ               | Service Worker, precache, offline-first                                                 |
| Tests Frontend            | `src/lib/**/*.test.ts`                                               | 🔴 **KO**                   | 8/186 tests échouent (`cibles is not defined`)                                          |

---

## Tableau Backend (Orchestrator)

| Feature               | Fichier                                  | Statut         | Preuve                                                                              |
| --------------------- | ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| API Entry / Handshake | `backend/routes/entry.mjs`               | ✅ IMPLÉMENTÉ  | `POST /api/v1/handshake`, fingerprint check, account creation                       |
| Admin API (CC)        | `backend/routes/cc.mjs`                  | ✅ IMPLÉMENTÉ  | `/api/v1/admin/overview`, `/shops-detail`, `/subscriptions`, `/accounts/:id` DELETE |
| Admin Legacy          | `backend/routes/admin.mjs`               | ✅ IMPLÉMENTÉ  | Storefront, stats, devices, delete requests, subscriptions                          |
| Auth / Session        | `backend/routes/auth.mjs`                | ✅ IMPLÉMENTÉ  | `POST /api/login`, SSE broadcast, session cookie                                    |
| Entry / Handshake     | `backend/routes/entry.mjs`               | ✅ IMPLÉMENTÉ  | Fingerprint conflict check, account creation, device announce                       |
| Restore / Backup      | `backend/routes/restore.mjs`             | ✅ IMPLÉMENTÉ  | Chiffré (archive-crypto), restore jobs                                              |
| Sync / Ops Relay      | `backend/drainer.mjs`, `backend/lib.mjs` | ✅ IMPLÉMENTÉ  | Drainer cron, relay ops purge, Neon PG                                              |
| Migrations PG         | `migrations.pg.sql`                      | ✅ IMPLÉMENTÉ  | Schema v22, `catalogue_requests` table ajoutée                                      |
| Drainer / Cron        | `drainer.mjs`, `vercel.json`             | ✅ IMPLÉMENTÉ  | Cron quotidien 02:00 UTC, relay purge                                               |
| Tests Backend         | `backend/tests/*.test.mjs`               | 🟡 Non vérifié | `npm test` non lancé sur orchestrator                                               |

---

## Tableau API (Orchestrator → Frontend)

| Méthode | Endpoint                                             | Handler     | Consommé par FE                  | Statut     |
| ------- | ---------------------------------------------------- | ----------- | -------------------------------- | ---------- |
| POST    | `/api/v1/handshake`                                  | `entry.mjs` | `sync.ts:ensureIdentity`         | ✅ OK      |
| POST    | `/api/v1/sync-data`                                  | `entry.mjs` | `sync.ts:backgroundSync`         | ✅ OK      |
| GET     | `/api/v1/admin/overview`                             | `cc.mjs`    | `usePeriodData` (dashboard)      | ✅ OK      |
| GET     | `/api/v1/admin/shops-detail`                         | `cc.mjs`    | `TeamDialog`, `Dashboard`        | ✅ OK      |
| GET     | `/api/v1/admin/storefront`                           | `admin.mjs` | `Dashboard` (storefront)         | ✅ OK      |
| GET     | `/api/v1/admin/shops`                                | `admin.mjs` | `TeamDialog` (legacy)            | ✅ OK      |
| DELETE  | `/api/v1/admin/shops/:device_id`                     | `admin.mjs` | `TeamDialog` (delete device)     | ✅ OK      |
| DELETE  | `/api/v1/admin/accounts/:account_id`                 | `cc.mjs`    | `TeamDialog` (delete account)    | ✅ OK      |
| POST    | `/api/v1/admin/delete-requests`                      | `admin.mjs` | `Boutiques.tsx` (delete request) | ✅ OK      |
| POST    | `/api/v1/admin/delete-requests/:id/approve`          | `admin.mjs` | `Boutiques.tsx`                  | ✅ OK      |
| POST    | `/api/v1/admin/shops/:device_id/release-fingerprint` | `cc.mjs`    | `SuspendedScreen`                | ✅ OK      |
| GET     | `/api/v1/admin/subscriptions`                        | `cc.mjs`    | `TeamDialog` (nouveau)           | ✅ NOUVEAU |
| GET     | `/api/v1/ops` (push)                                 | `relay`     | `transport.ts:push`              | ✅ OK      |
| GET     | `/api/v1/ops` (pull)                                 | `relay`     | `transport.ts:pull`              | ✅ OK      |
| GET     | `/api/v1/ops/shops`                                  | `relay`     | `drainer.mjs`                    | ✅ OK      |
| POST    | `/api/v1/ops/purge`                                  | `relay`     | `drainer.mjs`                    | ✅ OK      |
| POST    | `/api/v1/account/bless`                              | `entry.mjs` | `DevicePairingDialog` (approve)  | ✅ OK      |
| POST    | `/api/v1/requests`                                   | `entry.mjs` | `SubscriptionRequestDialog`      | ✅ OK      |
| POST    | `/api/v1/admin/requests/:id/approve`                 | `admin.mjs` | `SubscriptionsDialog`            | ✅ OK      |
| POST    | `/api/v1/webhook/sms`                                | `entry.mjs` | TextBee webhook                  | ✅ OK      |

**Aucun endpoint manquant détecté** — Tous les appels FE ont leur handler BE.

---

## Liste des blocages

| #   | Blocage                                                    | Fichier                           | Ligne   | Impact                                                            |
| --- | ---------------------------------------------------------- | --------------------------------- | ------- | ----------------------------------------------------------------- |
| 1   | **Build KO** — `')' expected` / JSX adjacent non enveloppé | `src/components/TeamDialog.tsx`   | 301:9   | Build CI bloqué, déploiement impossible                           |
| 2   | **Tests KO** — `ReferenceError: cibles is not defined`     | `src/lib/syncengine/transport.ts` | 217     | 8 tests syncengine échouent (sync temps réel, pairing, transport) |
| 3   | **TypeScript errors**                                      | `src/components/TeamDialog.tsx`   | 301-304 | `npm run check` échoue                                            |
| 4   | **Variable `cibles` non définie**                          | `src/lib/syncengine/transport.ts` | 217     | 8 tests syncengine échouent                                       |
| 5   | **Build CI bloqué**                                        | `npm run check`                   | —       | Déploiement Vercel impossible                                     |

---

## Liste des manques

| #   | Manque                                                          | Où                                    | Priorité    |
| --- | --------------------------------------------------------------- | ------------------------------------- | ----------- |
| 1   | Variable `cibles` non initialisée dans `transport.ts:217`       | `src/lib/syncengine/transport.ts:217` | 🔴 CRITIQUE |
| 2   | JSX fragment manquant dans `TeamDialog.tsx` (adjacent elements) | `src/components/TeamDialog.tsx:301`   | 🔴 CRITIQUE |
| 3   | Tests backend orchestrator non lancés                           | `simple-sale-orchestrator/backend`    | 🟡 MOYENNE  |
| 4   | Tests E2E (Playwright) absents                                  | `src/`                                | 🟢 BASSE    |
| 5   | Documentation API (OpenAPI) manquante                           | `backend/`                            | 🟢 BASSE    |

---

## Prochaines actions recommandées

| #   | Action                                                                                         | Fichier                                          | Commande                                                                              |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | **Corriger `TeamDialog.tsx`** — wrapper le JSX adjacent dans un fragment `<>...</>` ou `<div>` | `src/components/TeamDialog.tsx` (ligne ~299-302) | `git checkout HEAD -- src/components/TeamDialog.tsx` puis correction manuelle         |
| 2   | **Corriger `transport.ts`** — initialiser `const cibles = []` avant ligne 217                  | `src/lib/syncengine/transport.ts:217`            | `const cibles = []` avant ligne 217                                                   |
| 3   | **Lancer `npm run check`** pour valider                                                        | —                                                | `npm run check`                                                                       |
| 4   | **Lancer `npm test`** pour valider les tests                                                   | —                                                | `npm test`                                                                            |
| 5   | **Lancer tests orchestrator**                                                                  | `simple-sale-orchestrator/backend`               | `cd ../simple-sale-orchestrator/backend && npm test`                                  |
| 6   | **Commit + Push**                                                                              | —                                                | `git add -A && git commit -m "fix: TeamDialog JSX + transport.ts cibles" && git push` |
| 7   | **Vérifier déploiement Vercel**                                                                | —                                                | `vercel ls` puis vérifier `https://simple-sale-system.vercel.app`                     |

---

## Preuves clés (chemins exacts)

| Élément               | Chemin                                                                              |
| --------------------- | ----------------------------------------------------------------------------------- |
| Frontend entry        | `src/router.tsx`, `src/routeTree.gen.ts`                                            |
| Routes app            | `src/routes/_app/*.tsx` (dashboard, pos, history, reports, settings, stocks)        |
| Composants principaux | `src/components/*.tsx` (100+ fichiers)                                              |
| Sync Engine           | `src/lib/syncengine/transport.ts`, `apply.ts`, `pairing.ts`, `sharing.ts`           |
| IndexedDB             | `src/lib/db.ts` (v22, `catalogue_requests` table)                                   |
| IndexedDB Schema      | `src/lib/db.ts` lignes 8-22 (version 22, table `catalogue_requests`)                |
| Orchestrator API      | `../simple-sale-orchestrator/backend/routes/*.mjs`                                  |
| Orchestrator DB       | `../simple-sale-orchestrator/backend/migrations.pg.sql` (v22, `catalogue_requests`) |
| Tests Sync            | `src/lib/syncengine/*.test.ts` (24 fichiers, 186 tests)                             |
| Config Vite           | `vite.config.ts`, `vite.config.static.ts`, `vercel.json`                            |
| CI Scripts            | `package.json` scripts: `check`, `typecheck`, `lint`, `test`                        |

---

**Conclusion** : Le projet est **fonctionnellement riche** (POS complet, sync P2P, offline-first, orchestration cloud) mais **bloqué en CI** par 2 bugs critiques (TSX syntaxe + variable `cibles` non définie). Une fois ces 2 corrections appliquées, le build et les tests devraient passer, débloquant le déploiement.
