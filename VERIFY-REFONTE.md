# VERIFY-REFONTE — Inventaire avant refonte

Étape 0, **lecture seule**. Aucun code modifié. Toutes les lignes sont vérifiées dans le code.
Commandes : `grep` sur `useClusterFeatures|CLUSTER_MAP|prefs.cluster`, `Select-String` sur les
conditions cluster, lecture de `db.ts` (schéma `Product`) et `ProductForm.tsx` (champs rendus).

---

## 1. Qui lit le cluster, et où

| Fichier:ligne | Rôle actuel | Verdict |
|---|---|---|
| `settings.ts:184` | `CLUSTER_MAP` — source unique des 9 configs | 🟢 GARDER (déclaration) |
| `settings.ts:403` | `ACTIVE_CLUSTERS` — liste pour onboarding | 🟢 GARDER |
| `settings.ts:480` | `normalizeCluster()` — migration `businessType` → `cluster` | 🟢 GARDER |
| `use-cluster-features.ts:44` | Lit `CLUSTER_MAP[cluster]`, dérive ~18 flags | ⚠️ Le point de suppression (étape 7) |
| `use-cluster-features.ts:47` | `personnalise` + `customUnitType` → surcharge poids | ⚠️ Non cosmétique (voir §5) |
| `pos.tsx:269` | `features = useClusterFeatures()` | 18 usages cluster dans la caisse |
| `stocks.tsx:271` | `{ isService }` — libellé stock | ⚠️ Non cosmétique |
| `reports.tsx:135` | `{ isService, hasWeightInput }` — KPI | ⚠️ Non cosmétique |
| `dashboard.tsx:229` | `features = useClusterFeatures()` | à examiner |
| `ProductForm.tsx:56` | Destructuration de 7 flags | 23 conditions cluster |
| `Onboarding.tsx:143,252,646,853-854` | Choix + libellés + `clusterConfig` | Cosmétique **sauf** `853-854` |
| `pairing.ts:114,251` | `cluster` transmis au serveur (pairing) | 🔴 **Contrat serveur** |
| `DevicePairingDialog.tsx:225,231` | `cluster` + dérivation `restaurant/snack` | 🔴 **Contrat serveur** |
| `welcome.tsx:596` | `CLUSTER_MAP[...].label` — texte | 🟢 GARDER (texte) |

**Bilan étape 7 (« supprimer `CLUSTER_MAP` + `useClusterFeatures` ») : 11 fichiers, dont
`pairing.ts` et `DevicePairingDialog.tsx` qui envoient le cluster à l'orchestrateur.** Ce n'est
pas du cluster cosmétique : c'est un **champ de protocole** côté serveur.

---

## 2. Conditions cluster dans le code métier

### `pos.tsx` — 18 occurrences

| Ligne | Condition | Dépend du cluster ? | Verdict |
|---|---|---|---|
| 272 | `workflowType === "order-prep"` | Oui — pilote rounds/préparation | 🟠 **Métier** (restaurant) |
| 489-493 | `features.isService` → filtre `p.type === "service"` | Oui — mais filtre **par produit** | 🔵 Devient inutile (§3) |
| 495 | `!features.isService` → filtre catégorie | Oui | 🔵 Devient inutile |
| 861, 1121 | `features.hasTables` → plan de salle | Oui | 🟠 **Métier** (restaurant, bar) |
| 977, 1046 | `!features.isService` → sélecteur catégorie | Oui | 🔵 Devient inutile |
| 1008, 1014, 1076 | `features.isService` → onglets prestations | Oui | 🔵 Devient inutile |
| 1172-1173 | `defaultCategory`/`defaultType` du form | Oui | 🔵 Devient inutile |
| 1311, 1431 | `isService={features.isService}` propagé | Oui | 🔵 Devient inutile |
| **1654** | `features.isLocation` → **rend `<RentalView />` à la place du panier** | Oui | 🔴 **Métier** (location) |

### `Onboarding.tsx` — 32 occurrences
Cosmétiques (choix d'activité, libellés, `SUB_CATEGORY_LABELS`) **sauf** :
- `853-854` : `const config = CLUSTER_MAP[cluster]` → sert les features du tuto
- `857` : `cluster === "weight" || (personnalise && customUnitType === "weight")` → **vente au poids**
- `865-866` : `isServiceCluster` + `serviceMode` → **mode produit/prestation** (⚠️ déjà `type`)

### `ProductForm.tsx` — 23 occurrences
`isLocation` (9), `isAsset` (5), `unitType` (4), `productType` (7), `hasExpiryDate` (1),
`hasSerialNumber` (1), `hasWeightInput`/`hasVariants` (déstructurés, **non utilisés dans le rendu**).

---

## 3. Schéma `Product` actuel (`db.ts:74-129`)

| Champ | Ligne | Type | Utilisé par | Verdict |
|---|---|---|---|---|
| `name` | 76 | `string` | tout | 🟢 GARDER |
| `cost` | 78 | `number` | form 291, marge 313-323, analytique | 🟢 GARDER |
| `price` | 79 | `number` | tout | 🟢 GARDER |
| `stock` | 80 | `number` | caisse, rapports, alertes | 🟢 GARDER |
| `category` | 80 | `Category` | caisse, rapports | 🟢 GARDER |
| `variants` | 82 | `ProductVariant[]` | form 406, pos 805/1572, card 231 | 🟢 GARDER |
| **`type`** | **84** | **`"product" \| "service"`** | **form 79-81/384-405, pos 491, card 41, onboarding 904** | 🟢 **EXISTE DÉJÀ** |
| `unitType` | 87 | `"unit"\|"weight"` | form 205/564, analytique 661 | 🟠 Métier (boucherie) |
| `weightUnit` | 89 | `string` | affichage | 🟠 Métier |
| `expiryDate` | 91 | `number` | form 596 | 🟠 Métier (périssable) |
| `serialNumber` | 93 | `string` | form 455 (inactif), card 225 | ⚫ **Inactif** (`false` ×9) |
| `unit` | 95 | `piece\|meter\|liter` | form 564-595 | 🟠 Métier (quincaillerie) |
| `photo` | 100 | `string` (dataURL) | form, card | 🟢 GARDER |
| `min_stock` | 107 | `number` | alertes | 🟢 GARDER |
| `is_asset` | 110 | `boolean` | **location** | 🔴 Métier |
| `rental_pricing` | 112 | objet 5 périodes | location, pos | 🔴 Métier |
| `deposit_amount` | 119 | `number` | location | 🔴 Métier |
| `total_units` | 121 | `number` | location | 🔴 Métier |
| `return_date` / `expected_return_date` | 124/126 | `number` | `RentalReturnDialog` | 🔴 Métier |
| `reminderDate` | 128 | `number` | `RentalReminderBanner` | 🔴 Métier |

**Total : 21 champs sur `Product`.** Pas 35 (les 35 venaient de l'ancienne matrice
`FIELDS_BY_CLUSTER`, supprimée au commit `9ed0d789`).

---

## 4. Champs actuellement affichés dans `ProductForm`

| Bloc | Ligne | Condition actuelle | Verdict refonte |
|---|---|---|---|
| Nom | 239 | — | 🟢 GARDER |
| Photo | 261-285 | — | 🟢 GARDER |
| **Coût + Prix** | 287-323 | `!isLocation && !isAsset` | 🟢 GARDER (marge = but produit) |
| Marge en direct | 313-323 | `price>0 && cost>0` | 🟢 GARDER |
| Stock | 331-344 | `productType==="product" && variants.length===0` | 🟢 GARDER |
| **Stock illimité** | 346-355 | — | 🟢 GARDER |
| Seuil min stock | 357-372 | `variants.length===0 && !unlimited` | 🟢 GARDER |
| **Type Produit/Prestation** | 378-405 | `!isLocation` | 🟢 **EXISTE DÉJÀ** |
| Variantes | 406-454 | `productType === "product"` — ⚠️ **pas `hasVariants`** | 🟠 **seul vrai bug** |
| N° série | 455-465 | `hasSerialNumber` (**toujours false**) | ⚫ Inactif |
| Location (unités, 5 périodes, caution, rappel) | 467-561 | `isLocation` | 🔴 Métier |
| Unité (pièce/mètre/litre) | 563-595 | `!isAsset && (mixed\|weight) && product==="product"` | 🟠 Métier |
| Péremption | 596-607 | `hasExpiryDate && product==="product"` | 🟠 Métier |
| Catégorie | 608-611 | — | 🟢 GARDER |

**Le formulaire affiche déjà 6 champs visibles max** pour un produit standard
(nom, photo, coût, prix, stock, illimité, seuil, type, catégorie).

---

## 5. Ce que l'Étape 0 invalide dans le plan

### 5.1 — L'étape 2 est déjà écrite dans l'histoire

`type` existe (`db.ts:84`) et **Dexie v11 s'appelle littéralement « type de produit
(product/service) »** (`db.ts:718-719`). Les étapes 2, 3, 4, 5 du plan 7 étapes
sont **déjà implémentées** : le sélecteur Produit/Prestation (`ProductForm:378-405`),
le form court service (`:331` `:357` `:563` `:596` tous conditionnés `productType==="product"`),
la caisse service (`pos:489-493`, `ProductCard:49`), l'onboarding (`Onboarding:904`).

### 5.2 — La règle finale est incompatible avec « zéro perte »

> *« Si après refonte un `if (cluster === ...)` existe encore dans le code métier → mission échouée »*

Or ces conditions **portent de la vraie logique métier** :
- `pos.tsx:1654` — `isLocation` rend `<RentalView/>` **à la place du panier** (chiffre d'affaires location)
- `pos.tsx:861/1121` — `hasTables` (plan de salle restaurant)
- `pos.tsx:272` — `order-prep` (rounds)
- `use-cluster-features.ts:47` — `personnalise` + `customUnitType` → vente au poids

Supprimer le cluster **du métier** casse ces 4 fonctionnalités, qui sont des activités
réelles avec données réelles. La règle est réalisable seulement si le cluster **sort du
métier par des capacités**, pas par suppression.

### 5.3 — `pairing.ts` / `DevicePairingDialog` : contrat serveur

`cluster` est **envoyé à l'orchestrateur** (`pairing.ts:114`, `:251` ;
`DevicePairingDialog.tsx:225`). Le supprimer côté client casse l'inscription du pairing
avec le backend. Étape 7 aussi coûteuse que prévu.

---

## 6. Recommandation

La simplification utile **n'est pas** « ajouter kind » (existe) ni « supprimer le cluster du
métier » (casse 4 activités + le pairing serveur). C'est :

| # | Chantier | Taille | Risque |
|---|---|---|---|
| **A** | Guard variants `ProductForm` **+ `Onboarding`** (garde-fou données existantes) | 2 fichiers | 🟡 Moyen |
| **B** | `pos:489-495,1008-1014,1076` : le filtre service devient **par onglet**, plus par cluster | 1 fichier | 🟢 Faible |
| **C** | `hasSerialNumber` : laisser inactif **ou** l'ajouter à `syncengine` (absent) | 1-2 fichiers | 🟢 Faible |

Ces trois attacks draught **la règle finale** de ton plan (« le cluster ne vit plus que
dans le texte ») pour `pos.tsx`, sans casser location/tables/poids/pairing.

---

## Sortie attendue

`VERIFY-REFONTE.md` ci-dessus. **Aucune ligne écrite dans `src/`.**
Prochaine décision : valider A+B+C, ou redéfinir la règle finale pour qu'elle soit
atteignable sans casser location/tables/poids/pairing.