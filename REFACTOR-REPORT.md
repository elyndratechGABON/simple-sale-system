# REFACTOR-REPORT — ECAISSE, refonte PRD v2.0

Suivi des étapes, des écarts, et des points ouverts vérifiés.
Chaque étape = un commit, les trois portes vertes (`check` / `test` / `build`).

---

## Commits

| # | Étape | Commit | État |
|---|-------|--------|------|
| 0 | Registre `FIELDS_BY_CLUSTER` supprimé (jamais importé) | `9ed0d789` | ✅ |
| 1 | Guard variants (`ProductForm` + `Onboarding`) | `6b1dc4b1` | ✅ |
| 2 | Unification des unités + migration Dexie v23 | `fe9f2627` | ✅ |
| 2b | **Vente au kilo réparable** (hors plan, bug de CA) | `9071c16b` | ✅ |

---

## Écarts de plan (3 categories)

### Écarts tectiques — le plan Was wrong, better result

| Étape | Plan proposait | Fait | Pourquoi |
|---|---|---|---|
| 1 | `editing?.variants?.length > 0` | `variants.length > 0` (état local) | Le bloc reste affiché si l'utilisateur retire puis rajoute une variante ; avec `editing` il disparaîtrait en cours de saisie |
| 1 | rien pour l'onboarding | `cluster === "clothing"` | `Onboarding.tsx` lit `CLUSTER_MAP` directement, n'appelle pas le hook — 1 ligne, pas d'import |
| 2 | migrer `weightUnit` → `unit` | supprimer `weightUnit` | Une seule valeur réelle (`"kg"`), déjà portée par `unitType`. Migrer aurait créé un doublon |
| 2 | touche aussi le cluster | `ClusterConfig.stock.unitType` **intouché** | C'est lui qui décide **quoi proposer**, pas le produit. Les deux homonymes ne disparaissent pas ensemble |

### Écarts de sécurité — un test a échoué, c'était l'attendu

`unit-migration.test.ts` : j'attendais `p1` avant `p2` (ordre d'insertion). La fonction trie par **poids décroissant** — c'est le riz (3 kg) devant le bœuf (2 kg). Corrigé le test, pas le code.

### Écarts de périmètre — bugs hors plan trouvés en route

Voir « Points ouverts » ci-dessous.

---

## Points ouverts

### ✅ RESOLU — vente au kilo (détecté entre les étapes 2 et 3)

Le rapport de poids lisait `quantity` comme des kg, mais la caisse ne pouvait pas en saisir. **Trois défauts cumulés, tous en CA, aucun visible à l'écran** :

| Défaut | Effet | Ligne d'origine |
|---|---|---|
| Regex `\D` sur les 2 champs de quantité | « 2,5 » → « 25 ». Poids décimal impossible | `pos.tsx` appui long + ligne libre |
| `Math.round` sur la ligne libre | 2,5 kg → 3. **500 FCFA en trop** à 1000/kg | `pos.tsx:2343` |
| `Number("2,5")` → `NaN` | repli silencieux sur 1 | `pos.tsx:2335` |

Corrigé dans `9071c16b` (+16 tests). La logique est sortie du JSX vers `src/lib/pos-quantity.ts` (règle 3 : injection, pas de règle cachée dans un `onChange`).

**Vérifié ensuite : la déduction de stock en base était DÉJÀ correcte.**

| Étape | Ligne | Comportement |
|---|---|---|
| `createSale` | `db.ts:1554` | `applyStockDelta(db, id, -line.quantity, …)` |
| `addRound` (tables) | `db.ts:1857` | `applyStockDelta(db, id, -line.quantity, …)` |
| `applyStockDelta` | `db.ts:1456` | `p.stock + quantity`, borné à 0 |
| variantes | `db.ts:1440` | `(v.stock ?? 0) + quantity`, borné à 0 |
| `removeStock` | `db.ts:1347` | `Math.min(max(0, quantity), stock)` |

Aucun `Math.round` / `Math.floor` sur une quantité de stock : **10 kg − 2,5 kg = 7,5 kg**. Les 3 `Math.round` de `db.ts` portent sur le nombre de clients, la remise (entier par nature) et la durée de location en jours.

→ **Pas de commit stock dédié.** La saisie était le seul défaut.

### ⬜ Ouvert — `nextQtyAfterSale` inutilisé

Écrit dans `pos-quantity.ts`, **branché nulle part** : la déduction réelle passe par `applyStockDelta`, qui était déjà correcte. À supprimer au nettoyage (double règle = source de désaccord).

### ⬜ Ouvert — variantes sur les services

Le PRD dit « variantes : produit **ou** service ». Le code : uniquement les produits (le `&&` de l'étape 1 préserve le comportement existant). À traiter quand le POS service sera touché (étape 7).

### ⬜ Ouvert — `serialNumber` absent de `syncengine`

Le champ est câblé (`db.ts`, `ProductForm`, `ProductCard`, `exports/json.ts`) mais **pas dans `syncengine`** : un IMEI saisi sur une caisse n'atteint pas l'autre. Décision : l'ajouter ou l'assumer inactif. Le champ est par ailleurs `false` sur les 9 clusters (`hasSerialNumber`), donc non saisissable — l'incohérence est préexistante, pas créée ici.

### ⬜ Ouvert — inscription employé (étape 9 bloquée)

QR ou code 6 chiffres ? Non tranché dans le PRD.

---

## Garde-fous appliqués

| Décision | Raison |
|---|---|
| Migration v23 ne touche **pas** `updated_at` | Ce sont des fiches, pas des ventes. Les modifier ferait refluer tout le catalogue en sync P2P chez chaque commerçant au premier lancement, pour un changement d'orthographe |
| `unitType:"weight"` + `unit:"meter"` → **garde `meter`** | Un produit au poids peut porter une unité de vente (cylindre, étagère). Perdre le conditionnement effacerait une information saisie |
| Tap simple ajoute toujours `1` | La balance ne se devine pas. L'appui long (réparé) reste le geste de correction. Commenté, pas inventé |
| `cost` et `location` conservés | `cost_at_sale` figé dans l'historique (règle `AGENTS.md`) ; location = 141 réf. et un store Dexie v17 |

---

## Chiffres

| Étape | Tests | Build |
|---|---|---|
| départ | 186 | ✅ |
| après garde variants | 186 | ✅ |
| après unification unités | 195 (+9) | ✅ |
| après vente au kilo | 211 (+16) | ✅ |

`check` : 0 erreur, 5 warnings préexistants (`react-refresh/only-export-components`).