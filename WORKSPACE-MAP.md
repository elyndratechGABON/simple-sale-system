# WORKSPACE-MAP — Cartographie avant refonte

Étape 0, **lecture seule**. Aucun code écrit dans `src/`.
État au commit `807a261b`.

---

## Résumé chiffré

| Périmètre | Fichiers | Lignes |
|---|---|---|
| `src/` (hors tests) | **183** | **34 017** |
| `src/` tests (exemptés) | 28 | — |
| `simple-sale-orchestrator/` (autre dépôt) | 71 | — |

| Zone actuelle | Fichiers | Lignes |
|---|---|---|
| `components/` (hors ui) | 63 | 11 634 |
| `shared/ui/` (aujourd'hui `components/ui`) | 22 | 1 706 |
| `hooks/` | 13 | 1 115 |
| `lib/` | 67 | 11 603 |
| `routes/` | 15 | 7 875 |
| divers | 3 | 84 |

**57 fichiers > 200 lignes** à traiter.

---

## 1. Le backend n'est pas dans ce dépôt

| Constat | Conséquence |
|---|---|
| `simple-sale-orchestrator/` est un **dépôt git séparé** (`a11c434`), pas un sous-dossier | La structure « `frontend/` + `backend/` + `api/` à la racine » **ne peut pas s'appliquer telle quelle** sans fusionner deux dépôts |
| Pas de `.gitmodules` | Ce n'est pas un submodule : fusionner = `git subtree` ou dépôt unique |
| `api/index.mjs` existe **déjà** dans `backend/` | Le dossier `api/` existe, mais **côté backend**, pas à la racine |

**C'est le point bloquant n°1 de la Partie 2.** Deux options :

| Option | Effet |
|---|---|
| **A — Dépôts séparés** : garder `simple-sale-system` (front) et `simple-sale-orchestrator` (back) côte à côte | Zéro risque git. La racine commune n'existe pas, donc pas de « 3 zones ». Le contrat HTTP reste implicite (noms d'endpoints écrits des deux côtés) |
| **B — Dépôt unique** : fusionner via `git subtree`, obtenir un vrai monorepo 3 zones | Le gain est réel (contrat `api/contracts/` partagé), mais c'est une **opération git qui réécrit l'historique** des deux côtés, avec deux remotes. Risque élevé, aucune bénéfice test avant |

Je n'ai pas tranché. Cela décide de toute la Partie 2.

---

## 2. Coût du déplacement du frontend

| Mesure | Valeur |
|---|---|
| Imports `@/` (alias vers `src/`) | **320** dans **67** fichiers |
| Imports relatifs (`./`, `../`) | **58** |
| Barrels `index.ts` existants | **3** (`components/pos`, `components/reports`, `lib/syncengine/transport`) |

L'alias est défini en un seul endroit par fichier de config :
- `vite.config.ts` : `alias: { "@": `${process.cwd()}/src` }`
- `tsconfig.json` : `"@/*": ["./src/*"]`

Déplacer `src/` → `frontend/src/` **ne casse aucun import** : les deux pointent sur `src/`, il suffit de changer la racine. Les **58 imports relatifs** sont le vrai risque — ils portent la profondeur du chemin, donc chacun doit être recalculé au déplacement.

---

## 3. Classement des fichiers > 200 lignes

### 🔴 Files de la refonte en cours

| Lignes | Fichier | Feature cible |
|---|---|---|
| 2600 | `lib/db.ts` | `db/` |
| 1583 | `routes/_app/pos.tsx` | `pos/` |
| 1550 | `routes/_app/settings.tsx` | `settings/` |
| 1338 | `routes/_app/stocks.tsx` | `stocks/` |
| 1303 | `components/Onboarding.tsx` | `onboarding/` |
| 645 | `components/ProfitSheet.tsx` | `reports/` |
| 578 | `components/ProductForm.tsx` | `products/` |

### 🟠 > 500, hors refonte

`routes/_app/dashboard.tsx` (796) · `lib/gatekeeper.ts` (695) · `lib/analytics.ts` (629) ·
`routes/welcome.tsx` (621) · `routes/index.tsx` (615) · `components/settings/EmployeeAccountPanel.tsx` (552)

### 🟡 200-500

`lib/settings.ts` (527) · `DevicePairingDialog.tsx` (517) · `syncengine/apply.ts` (503) ·
`TeamDialog.tsx` (435) · `routes/_app/history.tsx` (420) · `ActivityDialog.tsx` (394) ·
`use-barcode-scanner.ts` (393) · `PaymentModal.tsx` (385) · `syncengine/transport.ts` (378) ·
`SubscriptionsDialog.tsx` (356) · `restitution.ts` (329) · `RentalView.tsx` (329) ·
`syncengine/identity.ts` (326) · `RentalBookingDialog.tsx` (321) · `demo-data.ts` (310) ·
`components/ui/chart.tsx` (296) · `sync.ts` (267) · `ProductCard.tsx` (264) ·
`voice/parser.ts` (261) · `RentalReturnDialog.tsx` (250) · `pairing.ts` (247) ·
`use-pwa-install.ts` (246) · `syncengine/types.ts` (245) · `exports/json.ts` (233) ·
`syncengine/transport/pull.ts` (215) · `ImageCropper.tsx` (211) · `ProductCardSettings.tsx` (206) ·
`syncengine/pairing.ts` (205)

### 🟢 `backend/` (6 hors tests)

`routes/admin.mjs` (1293) · `routes/cc.mjs` (911) · `lib.mjs` (709) · `routes/entry.mjs` (640) ·
`config.mjs` (249) · `drainer.mjs` (226)

---

## 4. Fichiers transverses (ne vont pas dans une feature)

| Chemin | Lignes | Destination proposée |
|---|---|---|
| `lib/db.ts` | 2600 | `db/` (étape 5 du plan) |
| `lib/analytics.ts` | 629 | `shared/lib/` — lu par pos, stocks, reports, dashboard |
| `lib/format.ts` | — | `shared/lib/` |
| `lib/settings.ts` | 527 | `shared/lib/` — lu par onboarding ET pos |
| `lib/gatekeeper.ts` | 695 | `shared/lib/` — montage global |
| `lib/syncengine/**` (10 fichiers) | — | `sync/` |
| `lib/exports/**` | — | `shared/lib/` |
| `lib/pairing.ts` + `components/DevicePairingDialog.tsx` | 247 + 517 | `team/` — **contrat serveur** |
| `lib/voice/**` | 261 | `pos/` (dictée) |
| `lib/pricing.ts`, `lib/pwa.ts`, `lib/success-sound.ts`, `lib/offline-unlock.ts` | — | `shared/lib/` |
| `components/ui/**` (22) | 1706 | `shared/ui/` — **déjà prêt** |
| `routes/__root.tsx`, `routes/_app.tsx` | — | `app/` |

**Règle 6 de la Partie 1 (« code partagé → `shared/` ») s'applique à 15+ fichiers** qui sont utilisés par 2 features ou plus. C'est le premier arbitrage de la cartographie.

---

## 5. Doublons et frictions détectés

| Constat | Fichiers | Effet |
|---|---|---|
| **Deux `transport` dans `syncengine/`** | `syncengine/transport.ts` (378) + `syncengine/transport/` (4 fichiers) | Le fichier `.ts` ET le dossier portent le même nom. Résolution d'import non explicite — un import vers `./transport` peut viser l'un ou l'autre. Le dossier n'est utilisé par personne. |
| **`ProfitSheet` orphelin** | `components/ProfitSheet.tsx` (645) | 0 import. Feature terminée jamais montée. Sa logique (`lib/profit.ts`) est vivante. |
| **`reports.tsx` à 201 lignes** | `routes/_app/reports.tsx` | 1 ligne au-dessus de la limite (le compteur sous-compte la dernière). |
| **`db.ts` interposé partout** | `lib/db.ts` | Aucun découpage possible sans partager le singleton Dexie. **Dernier.** |

---

## 6. Plan de migration — ordre, avec le coût réel

| # | Étape | Fichiers touchés | Commits | Risque |
|---|---|---|---|---|
| **0** | Ce document | 0 | 0 | — |
| **1** | Trancher dépôt unique **ou** dépôts séparés | 0 (mais décision git) | 0 | 🔴 |
| **2** | `src/` → `frontend/src/` (alias + 58 imports relatifs) | 183 | 1 | 🟡 |
| **3** | Créer `shared/` et y déplacer ~15 fichiers transverses | ~15 | 15 | 🟢 |
| **4** | Migrer features du plus simple au plus complexe (10 features) | ~170 | ~170 | 🟡 |
| **5** | `db.ts` → `db/` | 1 → ~15 | 15 | 🔴 |
| **6** | `syncengine/` → `sync/` | 10 | 10 | 🟡 |

**Estimation : ~215 commits**, pas 1 par feature comme le suggère la Partie 3.

---

## 7. Ce que je conteste dans le document

Le document est solide sur les règles (200 lignes, 1 responsabilité, barrel, 1 commit = 1 extraction). Trois points ne passent pas à la vérification :

**1. « Barrel = seule API publique » coûte cher ici.** Il faut transformer **320 imports**. Aujourd'hui `import { listProducts } from "@/lib/db"` est direct et lisible ; avec barrel obligatoire, chaque feature aura une façade à maintenir. Le barrel n'apporte que **3 lignes** ici — et il en existe **3** seulement dans tout le dépôt. La règle est saine pour `features/`, mais pas pour `lib/` et `components/`.

**2. La feature `tables` n'existe pas dans le code.** Le plan la liste entre `sales` et `settings` (~10 fichiers). En réalité les tables sont **à l'intérieur de `pos.tsx`** (`openTable`, `addRound`, `serveTable`, `TableCard`, `rounds`). La créer comme feature demande d'abord d'extraire le cycle de tables du POS — sinon c'est une frontière imaginée.

**3. L'ordre « du plus simple au plus complexe » commence par `onboarding`, mais `onboarding.tsx` fait 1303 lignes.** C'est le **deuxième plus gros** fichier de `components/`. Le premier mouvement du plan est donc un scindage majeur, pas un déplacement simple.

---

## Sortie

`WORKSPACE-MAP.md`. **Aucun code écrit dans `src/`.**

En attente d'une décision sur le **point 1** (dépôt unique ou dépôts séparés) : elle conditionne toute la Partie 2 et coûte beaucoup plus cher que le reste.