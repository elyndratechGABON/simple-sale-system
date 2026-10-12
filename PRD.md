# PRD — ECAISSE

**Version** : 2.0
**Date** : 2026-10-12
**Statut** : Vision produit validée, prêt pour refonte

> **Note de traçabilité.** Ce PRD remplace 3 décisions prises dans les échanges précédents.
> Elles sont consignées en §12 pour qu'aucune ne disparaisse silencieusement :
> - **Location** était déclarée « gardée » (message précédent), puis listée « à supprimer »
>   dans un plan antérieur. **Ce PRD la conserve** (§6) — cohérent avec la décision la plus récente.
> - **`cost`** était classé « champ mort à supprimer ». **Ce PRD le conserve** et le déplace
>   en saisie batch (§5.5) — car `cost_at_sale` est figé dans l'historique des ventes.
> - **`expiryDate`** était classé « champ mort ». **Ce PRD le supprime** (§7) — décision
>   produit explicite, malgré son activation actuelle sur 3 clusters.

---

## 1. Vision en une phrase

> **Tenir la comptabilité d'un business simplement.**
>
> Enregistrer des produits (avec stock) ou des services (sans stock),
> vendre via la caisse, consulter un rapport traçable.

---

## 2. Ce qui se vend

**Deux choses, pas plus.**

| Type | Stock | Exemples |
|------|:-----:|----------|
| **Produit** | ✅ Oui (défaut) | Épicerie, vêtement, boisson, outil |
| **Service** | ❌ Non (défaut) | Plat, café, coupe, massage, cours |

**Toggle Stock** — l'utilisateur peut activer/désactiver le stock pour n'importe quel article.

---

## 3. Types de boutique

**Cosmétique uniquement.** Aucune logique métier ne dépend du type choisi.

Utilisé pour :
- Message de bienvenue
- Suggestions (facultatives) à la création produit
- Affichage

Types : `retail`, `restaurant`, `bar`, `service`, `clothing`, `weight`, `location`, `magasin`, `personnalise`.

---

## 4. Modèle de données

### Article

```ts
interface Product {
  id: string;
  type: "product" | "service";
  name: string;
  price: number;
  photo?: string;
  category: string;

  // Produit uniquement
  hasStock: boolean;
  stock?: number;
  min_stock?: number;
  unit?: "piece" | "kg" | "liter" | "meter";

  // Variantes (produit ou service)
  variants?: {
    name: string;
    price: number;
    stock?: number;
  }[];

  // Cost — saisi dans l'onglet Comptabilité (batch)
  cost?: number;

  // Location (activé pour le cluster location)
  is_asset?: boolean;
  rental_pricing?: { day?: number; week?: number; month?: number };
  deposit_amount?: number;
  total_units?: number;
  return_date?: number;
  expected_return_date?: number;
  reminderDate?: number;
}
```

### Vente

```ts
interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paid: number;
  change: number;
  payment_method: "cash" | "card" | "other";
  created_at: number;
  cancelled?: boolean;
}

interface SaleItem {
  product_id: string;
  name: string;              // figé à la vente
  price_at_sale: number;     // figé
  cost_at_sale?: number;     // figé (pour marges historiques)
  category_at_sale: string;  // figé
  quantity: number;
  variant_name?: string;
}
```

**Règle absolue** : `price_at_sale`, `cost_at_sale`, `category_at_sale` sont **figés**. Ne jamais
recalculer par jointure avec la fiche produit. *(Cette règle existe déjà dans `AGENTS.md` — le
refonte ne fait que l'entériner.)*

### Table (restaurant / bar)

```ts
interface Table {
  id: string;
  number: number;
  status: "free" | "occupied";
  cart: SaleItem[];          // panier en cours
  opened_at?: number;
}
```

**Deux états seulement.** Pas de « servi », « prêt », « cancel ».

---

## 5. Workflow utilisateur

### 5.1 Onboarding

```
1. Installer la PWA
2. Créer un compte (téléphone + mot de passe)
3. Choisir un type de boutique (COSMÉTIQUE)
4. Créer un PIN
5. → POS
```

Le type choisi n'a **aucun effet métier**. Texte de bienvenue uniquement.

### 5.2 Créer un article

```
1. /stocks → bouton « Nouvel article »
2. Choisir : [Produit] ou [Service]
3. Remplir :
   - Nom (obligatoire)
   - Prix (obligatoire)
   - Photo (optionnel)
   - Catégorie (obligatoire)
4. Si Produit (défaut) :
   - Toggle Stock (défaut ON)
   - Si ON : stock + seuil d'alerte
   - Unité : pièce / kg / litre / mètre
5. Variantes (optionnel, produit ou service) :
   - Nom + Prix + Quantité propre
6. Enregistrer
```

**Aucun champ `cost` ni `expiryDate` dans le formulaire.**

### 5.3 Vendre

**Mode direct (boutique simple)** :
```
1. /pos → grille produits
2. Ajouter au panier
3. Encaisser (espèces / carte / autre)
4. Stock déduit si hasStock = true
```

**Mode tables (restaurant / bar)** :
```
1. /pos → plan de salle
2. Tap sur table → ouvre panier
3. Ajouter items
4. Encaisser → table redevient libre
```

### 5.4 Consulter / comptabilité

```
1. /comptabilite (ancien /reports)
2. Sections :
   - CA (jour/semaine/mois/an)
   - Bénéfices (marge = CA − coût)
   - Coûts (saisie batch)
   - Exports (CSV / Excel / PDF)
```

### 5.5 Gérer les coûts (batch)

```
1. /comptabilite → onglet « Coûts »
2. Liste des produits
3. Cocher plusieurs lignes
4. Saisir un coût commun
5. Appliquer
```

---

## 6. Features conservées

| Feature | Statut | Notes |
|---------|--------|-------|
| Produit / Service | ✅ | Type principal (existe déjà, Dexie v11) |
| Variantes | ✅ | Nom + prix + stock propre |
| Stock + `min_stock` | ✅ | Alerte si ≤ seuil |
| Unités (piece/kg/liter/meter) | ✅ | Par produit |
| Tables + service à table | ✅ | Simplifié à 2 états |
| **Location** | ✅ | **Métier conservé** (store Dexie v17, 4 composants) |
| **Cost + Bénéfices** | ✅ | **Déplacé en Comptabilité**, `cost_at_sale` intact |
| Inscription employé (pairing) | ✅ | À simplifier ; `cluster` reste un contrat serveur |
| Sync P2P + relais | ✅ | Inchangé |
| PWA offline | ✅ | Inchangé |

---

## 7. Features supprimées

| Feature | Raison | Coût réel (vérifié) |
|---------|--------|---------------------|
| **Date d'expiration (`expiryDate`)** | Complexité faible valeur | Actif sur 3 clusters (retail = défaut, weight, personnalise). `ProductForm:596`, `alerts.ts`. Migration = purge, pas de risque de perte de CA. |
| Rounds restaurant | Simplifié en panier table | `addRound`/`payRound`/`serveTable`/`prepareTable`/`readyTable` = 12 occ. `db.ts` + 12 `tables-sync.test.ts` |
| Statuts tables multiples (`serve`, `ready`) | Simplifié à `free`/`occupied` | Store Dexie à vider proprement |
| Sous-catégories magasin | Cosmétique retiré | `SUB_CATEGORY_LABELS` (4 entrées), 35 réf. `subCategory` |
| Logique métier basée sur le cluster | Remplacé par toggles produit | `useClusterFeatures` (11 fichiers) + `CLUSTER_MAP` |
| **Saisie `cost` dans le formulaire produit** | Déplacée en Comptabilité | `ProductForm:287-323` — **le champ reste en DB** |

---

## 8. Règles d'architecture (code-architect)

1. Un fichier = une responsabilité. **Max 200 lignes.**
2. Contrats (`types.ts`) avant implémentation.
3. Injection de dépendances (pas de `getDB()` global dans la logique).
4. Un commit = une modification testable.
5. Aucune suppression sans `grep` prouvant zéro usage.
6. Aucun `any` non justifié.
7. **L'audit propose, la vérification dispose.**

---

## 9. Règle finale

> Le code métier ne connaît que :
> - `product.type` : « product » | « service »
> - `product.hasStock` : bool
> - `product.variants` : { nom, prix, stock? }
> - `table.status` : « free » | « occupied »
>
> Le cluster n'existe plus que comme **label cosmétique**.

---

## 10. Critères de succès

- [ ] Form produit ≤ 8 champs visibles
- [ ] Aucun `if (cluster === ...)` dans le code métier
- [ ] Tables : 2 états, pas plus
- [ ] `cost` saisi uniquement en Comptabilité
- [ ] `expiryDate` absent du code
- [ ] `cost_at_sale` intact (historique préservé)
- [ ] Build vert + tous les tests verts
- [ ] `grep -r "useClusterFeatures\|CLUSTER_MAP" src` → 0

---

## 11. Points ouverts (à trancher avant l'étape concernée)

| # | Question | Bloque | Note |
|---|----------|--------|------|
| 1 | **Inscription employé : QR ou code 6 chiffres ?** | Étape 9 | Non tranché dans le PRD |
| 2 | `serialNumber` : inactif assumé, ou ajouté à `syncengine` ? | Étape 11 | Absent de `syncengine` : l'IMEI ne se propage pas entre caisses |
| 3 | Unité `kg` : `unit` vaut `piece\|meter\|liter` aujourd'hui. Le PRD ajoute `kg` et **conserve `meter`**. La migration doit couvrir les deux. | Étape 2 | Non bloquant |

---

## 12. Historique des décisions (traçabilité)

| Date | Décision | Statut |
|------|----------|--------|
| msg précédent | « 9 clusters restent » (contre « réduire à 6 ») | ✅ Retenu |
| msg précédent | « Location reste » (141 réf., store v17) | ✅ Retenu — §6 |
| msg précédent | « `hasSerialNumber` : on le laisse tel quel » | ✅ Retenu — §11 point 2 |
| msg précédent | « `cost` = but produit, garder » | ✅ Retenu — §6, déplacé en §5.5 |
| plan antérieur | « Supprimer location / `cost` / `expiryDate` » | ❌ **Annulé** par ce PRD sauf `expiryDate` (§7) |
| **ce PRD** | `expiryDate` supprimé | ✅ Nouvelle décision produit, explicite |