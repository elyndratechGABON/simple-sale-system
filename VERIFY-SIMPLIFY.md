# VERIFY-SIMPLIFY — Étape 0, lecture seule

Aucun code modifié. Toutes les lignes sont vérifiées par `grep` / `Select-String` / lecture directe.

---

## 1. Les champs dits « morts » — ce que le grep dit vraiment

### `cost` — ❌ **vivant, 175 occurrences, 11 fichiers métier**

| Fichier | Occ. | Rôle |
|---|---|---|
| `profit.ts` | 12 | **Calculateur de bénéfices** |
| `ProfitSheet.tsx` | 24 | **Écran de bénéfices** (route dédiée) |
| `analytics.ts` | 11 | Marge, rentabilité |
| `db.ts` | 28 | `cost` + **`cost_at_sale`** (23 occ.) |
| `ProductForm.tsx` / `ProductCard.tsx` | 10 / 7 | Saisie + affichage |
| `profit.test.ts` | 20 | Tests dédiés |

**L'Étape 2 dit « `cost` → supprimer » et « marge → remplacer par CA ».**
Or `AGENTS.md` (landmine documentée) : *« Prix, coûts et catégories sont figés dans la ligne de
vente (`price_at_sale`, `cost_at_sale`, `category_at_sale`). Ne jamais recalculer un bénéfice
par jointure sur la fiche produit : cela réécrirait l'historique. »*

Supprimer `cost` **détruit l'historique des bénéfices** et rend `cost_at_sale` orphelin
(23 références). Ce n'est pas un champ mort, c'est **le but produit** (« tenir la comptabilité »).

### `expiryDate` — ❌ **vivant, activé sur 3 clusters**

```
settings.ts:198  hasExpiryDate: true   ← retail
settings.ts:339  hasExpiryDate: true   ← weight
settings.ts:364  hasExpiryDate: true   ← personnalise
```

L'Étape 2 le classe « champ mort ». `retail` est le cluster **par défaut** (`DEFAULT_PREFERENCES.cluster`).
Rendu : `ProductForm.tsx:596`. Ce n'est pas mort, c'est le suivi des périssables.

### `serialNumber` — ⚫ **inactif, mais câblé 5 fichiers**
`db.ts:93`, `ProductForm:82/202/457`, `ProductCard:225`, `exports/json.ts:46`.
**Absent de `syncengine`** (vérifié) : l'IMEI ne se propage pas entre caisses.
Le supprimer est possible ; le garder inactif aussi. Décision à trancher, pas une évidence.

### `unitType` / `weightUnit` — 🟠 **vivants pour la boucherie**
`unitType: "weight"` → saisie kg (`ProductForm:564`), analytique (`analytics.ts:661`),
`analytics-weight.test.ts`. Fusionner en `unit` est faisable, mais `unit` accepte
`piece|meter|liter` — **il n'a pas de valeur « kg »**. Le modèle `ProductUnit` de l'Étape 3
(`piece|kg|liter`) **perd `meter`** (quincaillerie) et ajoute `kg` qui n'existe pas aujourd'hui.

---

## 2. Location — ❌ **141+ références, 16 fichiers, store Dexie v17**

| Fichier | Occ. |
|---|---|
| `db.ts` | 29 (store `rentals` + 7 champs `Product` + version 17) |
| `use-rentals.ts` / `RentalView.tsx` | 20 / 18 |
| `analytics-rentals.test.ts` | 19 |
| `analytics.ts` | 16 |
| `RentalBookingDialog.tsx` | 6 |
| `NotificationBell.tsx` | 6 |
| `ProductForm.tsx` | 9 |
| `alerts.ts` / `asset-agenda.test.ts` / `reminders.ts` / `RentalReturnDialog.tsx` / `RentalReminderBanner.tsx` | 4 / 3 / 2 / 2 / — |

**L'Étape 1 (« SUPPRIMER LOCATION ») n'est pas un nettoyage de code mort.** C'est la suppression
d'une activité entière avec son store, ses 4 composants, son agenda de rappels et sa portion
d'analytics. Et **ton propre message de 2 réponses plus tôt** disait :

> « **Location reste.** C'est un vrai métier avec de vraies données (store rentals, 4 composants,
> ~141 références). Supprimer = casser du chiffre d'affaires. »

Le plan fourni à l'Étape 1 **contredit ta propre décision**. C'est la 2ᵉ fois en 3 messages
(la 1ʳᵉ : « réduire à 6 clusters », annulée et remplacée par « 9 clusters restent »).

`pos.tsx:1654` rend `<RentalView/>` **à la place du panier** : un commerçant de location
n'a pas de caisse, il a un écran de location. Le supprimer retire l'écran principal de sa boutique.

---

## 3. Étape 10 — déjà faite

| Action planifiée | État réel |
|---|---|
| « Supprimer `RecentSalesMini` du POS » | **Déjà fait** — commit `8eec70aa`, 0 occurrence |
| « Renommer tri bestsellers → Plus vendus (30j) » | **Déjà fait** — `stocks.tsx:861` |
| « Ajouter Stock ↓ » | **Déjà fait** — `stocks.tsx:257/383/857` |
| « `AUDIT*.md` → `docs/audit/` » | **Déjà fait** |
| « Supprimer registre `FIELDS_BY_CLUSTER` » | **Déjà fait** — commit `9ed0d789` |

**5 des 6 actions de l'Étape 10 sont déjà en place.**

---

## 4. Étape 3 — le modèle dupliqué `Product`

L'Étape 3 crée `src/lib/products/types.ts` avec un `export interface Product` **qui n'est pas
celui de `db.ts`**. Le plan suppression (`cost`) et le nouveau modèle (`category: string` au
lieu de `Category`, `hasStock` nouveau) créent **un deuxième `Product`** → exactement la
**troisième vérité** que `WORKFLOW-SIMPLIFY.md` a diagnostiquée et que le commit `9ed0d789`
vient de supprimer.

`hasStock` recouvre `unlimited` + `stock: Infinity` (deux représentations actuelles du même état).

---

## 5. Étapes faisables sans casser l'historique

| # | Étape | Verdict |
|---|---|---|
| **A** | Guard variants `ProductForm` + `Onboarding` | ✅ Faitable, gain UX réel |
| **B** | `pos:489-495` filtre service par onglet (`p.type`) | ✅ Faitable, aligne sur la règle finale |
| **C** | Tables simplifiées (`free`/`occupied` seuls) | ✅ Faitable — mais.db `addRound`/`payRound`/`serveTable`/`prepareTable`/`readyTable` = 12 occ. dans `db.ts` + 12 dans `tables-sync.test.ts`. Le store Dexie des rounds reste à vider proprement. |
| **D** | `hasSerialNumber` : inactif assumé **ou** ajouté à `syncengine` | ⚠️ Décision |
| **E** | `unitType`/`weightUnit`/`unit` → `ProductUnit` unifié | ⚠️ Doit couvrir `meter` **et** `kg` — le modèle du plan perd `meter` |

---

## 6. Ce que l'Étape 0 invalide

| Plan | Réfutation vérifiée |
|---|---|
| **Étape 1** supprimer location | 141+ réf., store v17, 16 fichiers. **Contredit ta décision « Location reste ».** |
| **Étape 2** `cost` mort | 175 réf., `profit.ts` + `ProfitSheet.tsx` + `cost_at_sale` ×23. **C'est le but produit.** |
| **Étape 2** `expiryDate` mort | `hasExpiryDate: true` sur retail (défaut), weight, personnalise. |
| **Étape 10** 5 actions | Déjà faites (commits `8eec70aa`, `68536ba3`, `9ed0d789`). |
| **Étape 3** | Recrée une 3ᵉ vérité `Product` —Inverse du commit `9ed0d789`. |
| **Règle finale** `cost` → 0 | Impossible : `cost_at_sale` est figé dans l'historique des ventes (`AGENTS.md`). |

---

## Sortie

`VERIFY-SIMPLIFY.md`. Aucun code écrit. Trois décisions bloquantes avant toute étape :

1. **Location** : on supprime (contre ta décision de 2 messages atrás) ou on garde ?
2. **`cost`** : on garde le calculateur de bénéfices (but produit) ou on le supprime vraiment ?
3. **`expiryDate`** : actif sur 3 clusters — à garder, je presume que oui.