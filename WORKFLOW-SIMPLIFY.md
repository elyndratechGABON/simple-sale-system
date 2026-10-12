# WORKFLOW-SIMPLIFY — Analyse de simplification

Analyse du workflow réel par cluster, comparé au workflow minimal théorique.
Source : lecture directe du code (`CLUSTER_MAP`, `useClusterFeatures`, `ProductForm`,
`pos.tsx`, `products/clusters.ts`). Aucun élément n'est estimé « utile » par défaut.

---

## 1. Workflow théorique (le but produit)

Le but : **une caisse offline-first qu'un commerçant ouvre, encaisse, et qui tient ses comptes.**

1. Enregistrer un article (produit **ou** prestation) — nom + prix (+ coût, stock si bien)
2. Vendre : choisir l'article, ajouter au panier, encaisser
3. Consulter le rapport (chiffre d'affaires, marge, meilleures ventes)

C'est tout. Tout le reste doit se justifier par l'un de ces trois pas.

---

## 2. Workflow réel par cluster

### Sources de vérité (le problème central)

Il existe **trois** registres qui prétendent décrire les mêmes champs, et ils se contredisent :

| Registre | Fichier | Rôle réel |
|----------|---------|-----------|
| `CLUSTER_MAP` | `src/lib/settings.ts` | Flags **effectivement lus** par l'UI (`useClusterFeatures`) |
| `FIELDS_BY_CLUSTER` | `src/lib/products/clusters.ts` | Matrice 9×14 **nouvelle**, **non branchée** sur l'UI |
| `ProductForm` | `src/components/ProductForm.tsx` | Rendu **effectif**, conditionné par `isLocation`/`productType`, pas par les flags |

`useClusterFeatures` lit `CLUSTER_MAP`. `ProductForm` consomme `useClusterFeatures` mais
**ignore** `hasVariants` / `hasRentalBooking`. La matrice `FIELDS_BY_CLUSTER` n'est lue par
personne. → **Trois vérités, deux inutilisées, des contradictions garanties.**

### Tableaux réels par cluster (d'après `CLUSTER_MAP`)

| Cluster | Workflow | Stock | Flags notables | Champs produits réellement saisis |
|--------|----------|-------|----------------|----------------------------------|
| **retail** | direct | unité, coût oui, péremption oui | — | nom, prix, coût, stock, catégorie, photo, péremption, unité |
| **restaurant** | order-first, **tables oui** | unité, **coût non** | — | nom, prix, catégorie, photo (+ tables/rounds côté POS) |
| **bar** | open-tab, **tables oui** | unité, coût oui | — | nom, prix, coût, stock, catégorie, photo |
| **service** | service | unité, coût oui | `allowServiceBooking` | nom, prix, coût, catégorie, photo (produit **ou** prestation) |
| **clothing** | direct | unité, **variants oui** | — | nom, prix, coût, stock, catégorie, photo, **variantes (taille/couleur)** |
| **magasin** | direct | **mixed**, sous-catégorie | — | nom, prix, coût, stock, catégorie, photo, unité (pièce/mètre/litre) |
| **weight** | direct, `hasWeightInput` | **poids**, péremption | — | nom, prix, coût, stock, catégorie, photo, **poids**, unité, péremption |
| **personnalise** | direct (+ kg/unité) | kg ou unité | — | idem retail ou weight selon `customUnitType` |
| **location** | rental | unité | `hasRentalBooking`, `hasDeposit`, `hasAvailability` | nom, **unités**, **prix par période**, caution, photo |

### Ce que l'UI rend en réalité (vs. ce que les flags promettent)

| Flag | Attendu | Réel dans `ProductForm` | Classe |
|------|---------|------------------------|--------|
| `hasVariants` | variants seulement pour clothing | **Ignoré** : le bloc variants s'affiche pour tout `productType === "product"` (l. 406-454) | 🔴 |
| `hasSerialNumber` | n° série pour électronique | `false` sur les 9 clusters → champ **inactif**.Chaîne câblée (db `93`, form `82/202/457`, card `225`, export JSON `46`) mais **absente de `syncengine`** : le n° de série ne suit pas la multi-caisse. Feature non livrée, pas code mort. | 🟠 |
| `hasRentalBooking` | périodes pour location | Déstructuré, **jamais utilisé** ; c'est `isLocation` qui gate tout. Redondant. | ⚫ |
| `hasExpiryDate` | péremption si périssable | ✅ conditionnel correct (l. 596) | 🟢 |
| `hasWeightInput` | poids si weight | ✅ conditionnel correct | 🟢 |
| `isLocation` | periods + caution + unités | ✅ conditionnel correct | 🟢 |
| `allergens`, `duration`, `weight` (matrice) | — | **Aucun champ UI**, aucun champ DB correspondant | 🟠 |

---

## 3. Écarts détectés

1. **Flags non câblés / redondants** : `hasVariants` et `hasRentalBooking` ne pilotent
   rien (le rendu est trouvé ailleurs) ; `hasSerialNumber` est câblé de bout en bout
   mais `false` partout — et son champ **manque dans `syncengine`**, donc même activé
   il ne se propagerait pas entre caisses. La matrice `magasin`/`location` le déclare
   pourtant utile.
2. **Blocage non conditionné** : les variantes s'affichent pour tout produit, y compris
   épicerie — et **aussi dans `Onboarding.tsx`** (l. 869-1143, garde non conditionnée),
   donc un compte non-clothing peut *créer* des variantes dès l'onboarding. La caisse
   les vend (`pos.tsx:805`) et la card les affiche (`ProductCard.tsx:231`). Les corriger
   dans le formulaire seul laisserait un second registre désynchronisé.
3. **Trois registres parallèles** : `FIELDS_BY_CLUSTER` (9×14) inventé, non branché ;
   `CLUSTER_MAP` réel ; `ProductForm` en dur. Toute évolution diverge.
4. **Champs de la matrice sans support** : `allergens`, `duration`, `weight` (kg) ne
   existent ni dans `ProductForm` ni dans l'interface `Product` (db.ts). La matrice
   promet ce que le code ne sait pas saisir.
5. **Modèles de données incohérents** : la matrice dit `duration` pour location ; le code
   utilise `rental_pricing` + `total_units` + `deposit_amount` (pas `duration`). Idem
   `expiry` vs `expiryDate`, `serial` vs `serialNumber`, `rental` vs `rental_pricing`.

---

## 4. Matrice de simplification

| Élément | Cluster(s) | Classe | Décision | Impact |
|---------|-----------|--------|----------|--------|
| Nom + prix | tous | 🟢 ESSENTIEL | Garder | — |
| Stock (biens) | retail, bar, clothing, weight, magasin, personnalise | 🟢 ESSENTIEL | Garder | — |
| Catégorie | tous | 🟢 ESSENTIEL | Garder | — |
| Coût d'achat | retail, bar, service, clothing, weight, magasin, personnalise, location | 🟢 ESSENTIEL (marge) | Garder | — |
| Photo | tous | 🟡 SUPPORT | Garder, simplifiable | — |
| Péremption | retail, weight, personnalise | 🟢 ESSENTIEL (périssable) | Garder | — |
| Poids / unité | weight, personnalise(kg), magasin | 🟢 ESSENTIEL | Garder | — |
| Variantes | clothing | 🟠 SPÉCIFIQUE | Garder, mais **conditionner à `hasVariants`** | Évite le bruit epicerie |
| Tables + rounds | restaurant, bar | 🟠 SPÉCIFIQUE | Garder isolé (déjà via `hasTables`) | — |
| Location (périodes, caution, unités) | location | 🟠 SPÉCIFIQUE | Garder isolé (via `isLocation`) | — |
| `hasSerialNumber` + champ n° série | — | ⚫ OUBLIÉ | **Supprimer** : `false` partout, jamais rendu | Retire un champ mort + du code |
| `hasRentalBooking` (flag) | location | ⚫ OUBLIÉ | **Supprimer** : redondant avec `isLocation` | — |
| `hasVariants` mal câblé | tous | 🔴 DÉCOR (bug) | **Corriger** : conditionner le bloc à `hasVariants` | Cache le bloc pour 8 clusters |
| `allergens` (matrice) | restaurant, service | 🟠 SPÉCIFIQUE (non implémenté) | **Ne pas lister** tant que non codé | Évite une promesse fausse |
| `duration` (matrice) | location | 🟠 SPÉCIFIQUE (mauvais nom) | **Renommer** en `rental_pricing` (ou `period`) | Aligne matrice ↔ DB |
| `weight` générique (matrice) | weight | 🟢 mais mal nommé | **Aligner** sur `weightUnit`/`unitType` | — |
| `FIELDS_BY_CLUSTER` (registre parallèle) | tous | 🔴 DÉCOR | **Supprimer ou brancher** — jamais deux vérités | Retire la contradiction |
| 9 clusters distincts | tous | 🟡 SUPPORT | **Simplifier à 3 modèles** (voir §5) | Divise la maintenance par ~3 |

---

## 5. Modèle cible proposé

### 3 modèles d'articles au lieu de 9 clusters

Les 9 clusters se ramènent à **3 formes de saisie** réelles :

| Modèle | Clusters couverts | Champs essentiels (≤ 8) |
|--------|-------------------|--------------------------|
| **Bien stocké** | retail, bar, clothing, weight, magasin, personnalise, location | nom, prix, coût, stock, catégorie, photo + *(poids OU unité OU variantes OU périodes)* |
| **Service** | service | nom, prix, coût, catégorie, photo |
| **À préparer** (order-first) | restaurant, bar | = Bien stocké + variante « table/round », isolé |

Champs **transverses conditionnels** (déjà dans `Product`) : `expiryDate`, `unit`,
`variants`, `rental_pricing`. Pas de matrice 9×14 à maintenir.

### Workflow unifié (identique pour tous)

1. `/pos` → choisir/ajouter un article → panier → encaisser
2. Spécificités isolées derrière **un seul** booléen chacun :
   - `hasTables` (restaurant, bar) → plan de salle
   - `hasWeightInput` (weight) → saisie kg
   - `hasVariants` (clothing) → variantes
   - `isLocation` (location) → périodes + caution + unités

### Ce qui reste cluster-spécifique (le minimum)

`hasTables`, `hasWeightInput`, `hasVariants` (correctement câblé), `isLocation`.
C'est **4 booléens** au lieu d'une matrice 14 colonnes × 9 lignes.

---

## 6. Plan de migration

| # | Étape | Effort | Risque | Détail |
|---|-------|--------|--------|--------|
| 1 | Supprimer les flags morts `hasSerialNumber`, `hasRentalBooking` (+ champ n° série) | S | Faible | Aucun cluster ne les active ; code mort. |
| 2 | Corriger le bloc variants : `{hasVariants && productType === "product" && (…)}` | S | **Moyen** | Cache le bloc pour 8 clusters ; vérifier clothing + les produits à variantes existants. |
| 3 | Aligner `FIELDS_BY_CLUSTER` sur `CLUSTER_MAP` **ou supprimer** le registre non branché | M | Faible | Une seule vérité. Supprimer si non branché ; sinon, générer depuis `CLUSTER_MAP`. |
| 4 | Renommer les champs de matrice divergents (`duration`→`rental_pricing`, `expiry`→`expiryDate`, `serial`→`serialNumber`) | S | Faible | Nommage seulement, aucun comportement. |
| 5 | Retirer de la matrice les champs non implémentés (`allergens`, `weight` générique) tant qu'ils ne sont pas codés | S | Faible | Évite la promesse fausse. |
| 6 | Documenter le modèle 3 formes + les 4 booléens comme cible | S | Aucun | Guide la suite ; aucun code. |

**Ordre** : 1 → 2 d'abord (propre + correction du bug d'affichage), puis 3-5 (nettoyage
registre), 6 (doc). Chaque étape est indépendante et réversible.

---

## Verdict

Le sur-engineering principal n'est pas le nombre de clusters (9, justifié par des
métiers réels) mais **la couche de parallaxe** : `FIELDS_BY_CLUSTER` (9×14) +
`CLUSTER_MAP` + `ProductForm` en dur. Trois vérités qui se contredisent, dont une
inventée et non branchée. Le gain immédiat : supprimer 2 flags morts + 1 champ DB mort,
et conditionner le bloc variants (actuellement visible chez l'épicier).