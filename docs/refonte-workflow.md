# Refonte du workflow métier — analyse UX par secteur

> Design figé le 2026-08-31. Document de travail : on analyse chaque espace et on améliore
> l'expérience **par type de boutique**, en personnalisant au mieux — sans casser l'existant
> (le moteur est déjà piloté par configuration, on l'enrichit, on ne le réécrit pas).

## Principe directeur

> L'utilisateur ne gère pas une base de données. Il gère son activité comme il la vit
> réellement.

- Pas de transaction bancaire intégrée : la « caisse » signifie *enregistrer ce qui a été
  vendu/réalisé et son encaissement*, pas effectuer un paiement en ligne.
- Un moteur de workflow configurable, pas une page par métier.
- Le cycle commun reste : **configurer → sélectionner → encaisser → clôturer → historique → rapports**.

## Ce qui existe déjà (état des lieux) — 2026-08-31

Le moteur est déjà piloté par config : `src/lib/settings.ts:163-379` définit 9 clusters
actifs, chacun avec `workflowType`, `workflow`, `stock`, `flags`. `pos.tsx` et `stocks.tsx`
branchent déjà sur ces flags.

| Cluster | `workflowType` | État |
|---|---|---|
| `retail` Épicerie | `direct` | ✅ stock, péremption, prix de revient |
| `restaurant` | `order-prep` | ✅ tables + ordre, `served_at` |
| `bar` | `open-tab` | ✅ tables optionnelles, addition ouverte, tournées |
| `service` Coiffeur | `service` | ✅ onglets Prestations/Produits, client facultatif |
| `clothing` Vêtements | `direct` | ⚠️ flag `hasVariants:true` mais **aucun modèle variante** |
| `weight` Boucherie | `weight` | ✅ vente au poids, stock kg |
| `magasin` | `direct` | ✅ `unitType:"mixed"` (pièce/mètre/litre) |
| `personnalise` | `direct` | ✅ domaine libre + kg/unité |
| `location` Actifs | `rental` | ✅ actifs + caution + périodes + unités |

Écrans : `dashboard` (accueil), `pos` (caisse = action principale), `stocks`, `reports`,
`history`, `settings`.

### Les 3 vrais trous fonctionnels

1. **Variantes (vêtements/chaussures)** — `clothing` dit `hasVariants:true` mais c'est un
   coquille : pas de champ `variants` en base (`db.ts:55-94`, interface `Product`), pas de
   stock/prix par variante, pas de sélecteur au panier.
2. **Location : rapports non différenciés** — l'engin location est robuste mais les agrégats
   `analytics.ts` sont génériques (pas de taux d'occupation, durée moyenne, revenu par actif).
3. **Rapports/bénéfices identiques pour tous** — aucune spécialisation par secteur.

## Améliorations UX par secteur

### 🛒 Épicerie/Alimentation (`retail`)
- **✅** catalogue + recherche, quantité, encaisser, retrait auto de stock, seuil, péremption.
- **➤** gros boutons photo, quantité rapide (− 1 + 2 +), badge « stock faible » rouge sur la
  vignette, encaissement court (espèces + rendu).

### 👕 Vêtements/Chaussures (`clothing`) — *chantier n°1*
- **➤ Construire** le modèle variante : `variants[{taille, couleur, pointure, prix, stock}]`
  sur le produit + écran de choix au clic + retrait de **la bonne variante**.
- **➤** vignette photo, sélecteur modal (taille S/M/L/XL, couleur, pointure), stock par variante.

### 🍔 Restaurant (`restaurant`)
- **✅** plan de salle, table, commande (`served_at`).
- **➤** cycle visuel table : `🟠 à préparer → 🟡 en préparation → 🟢 prête → 🟢 servie`,
  boutons « Préparer / Servir » sur la table.

### 🍹 Bar/Snack (`bar`)
- **✅** table, addition ouverte, tournées.
- **➤** plan de salle coloré (T1🟢 T2🟠), bouton « Voir l'addition », clôture → table
  disponible (cycle `payRound` existe déjà).

### 🍹 Bar + restau (composable)
- **✅** `bar.hasTablesOptional`, boissons+nourriture+tables sur la même addition.
- **➤** UI pour grouper visuellement les consommations.

### 💇 Coiffure/Salon (`service`)
- **✅** onglets Prestations/Produits, client facultatif, pas de retrait de stock.
- **➤** cartes `📷 prestation + prix`, **consommables associés optionnels** (mèche/gel) avec
  suivi activable/désactivable.

### 🚗🏠🪑 Location (`location`)
- **✅** actifs, tarifs par heure/jour/semaine/mois, caution, unités, disponibilité, retour.
- **➤** saisie dates début/fin avec **calcul auto durée + total**, statut Disponible/Louée,
  **rapport location** (occupation, revenu par actif).

### 🍗 Boucherie (`weight`)
- **✅** vente au poids, stock kg, saisie poids → prix auto.
- **➤** clavier de poids direct au clic, total en grand, retrait du poids exact.

## Roadmap (ordre proposé)

1. **Variantes** (clothing) — le seul manquant structurel.
2. **Cycle visuel commande → préparation → service** (restaurant).
3. **Rapports sectorisés** — location, boucherie, service.
4. **Fini UX/vignettes** par métier (photo, badges, gros boutons).
