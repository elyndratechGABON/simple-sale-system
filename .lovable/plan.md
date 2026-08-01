# Plan : Application de caisse (POS) simple

Application web offline-first pour gérer stocks, ventes et rendu de monnaie (FCFA), stockée dans IndexedDB.

## Stack

- TanStack Start (déjà en place), React, Tailwind
- `idb` (wrapper IndexedDB léger) pour la persistance locale
- Pas de backend nécessaire (tout local, offline-first)

## Structure des données (IndexedDB, base `pos-db`)

- `products` : `{ id, name, price, stock, category }`
- `sales` : `{ id, timestamp, total, cash_given, change_due, day_closed }`
- `sale_items` : `{ id, sale_id, product_id, name, quantity, price_at_sale }`

Un module `src/lib/db.ts` expose les opérations : `listProducts`, `addProduct`, `updateProduct`, `deleteProduct`, `createSale`, `listSalesToday`, `cancelSale`, `closeDay`.

## Routes

```text
/              → redirige vers /pos
/pos           → écran principal (nouvelle commande + caisse)
/stocks        → gestion des produits (CRUD)
/history       → ventes du jour (liste + détail + annulation)
/reports       → clôture de journée + récap + export CSV
```

Header commun avec liens : Caisse / Stocks / Historique / Rapports.

## Écran 1 — /stocks (Produits & Stocks)

- Bouton « + Nouveau produit » ouvre un dialog avec : nom, prix (FCFA), stock, catégorie (Boisson / Snack / Service / Autre), option « stock illimité » (pour les services).
- Liste tabulaire des produits avec édition inline (prix / stock) et suppression.

## Écran 2 — /pos (Caisse — cœur du système)

État vide : gros bouton « + Nouvelle commande » qui bascule en mode vente.

Mode vente :

- **Grille de produits** — un bouton par produit avec nom, prix, stock restant. Clic = +1 au panier. Bouton grisé si `stock ≤ 0`. Filtre par catégorie.
- **Panier** (colonne droite ou bas) — lignes `qty x nom = sous-total`, boutons +/− et supprimer, **Total** en gros.
- **Argent donné** — champ numérique large avec pavé tactile (boutons 500 / 1000 / 2000 / 5000 / 10000 pour saisie rapide).
- **Monnaie à rendre** — calculée en direct, très visible. Rouge si insuffisant avec message « Montant insuffisant, demander au moins X F ».
- **Valider la vente** — désactivé si panier vide ou paiement insuffisant. À la validation :
  1. Enregistre `sales` + `sale_items`
  2. Décrémente les stocks
  3. Affiche un toast de confirmation (Total / Rendu)
  4. Vide le panier et revient à l'état initial

## Écran 3 — /history (Ventes du jour)

- Liste : heure, total, donné, rendu — expandable pour voir les articles.
- Bouton « Annuler » sur chaque vente → dialog PIN (par défaut `1234`, stocké en localStorage, modifiable dans Rapports). Si correct : suppression de la vente + réintégration des stocks.

## Écran 4 — /reports (Clôture)

- Récap du jour : nombre de ventes, total encaissé, total monnaie rendue, top produits.
- Export CSV des ventes.
- Bouton « Clôturer la journée » (marque `day_closed=true`, bloque les modifications sans PIN admin).
- Réglage du code PIN.

## Design system

- Palette sobre orientée caisse (fond clair, primaire vert/émeraude pour actions positives, destructive rouge pour insuffisant / annuler).
- Tokens dans `src/styles.css` (variantes shadcn Button : `pos`, `pos-lg`, `success`).
- Optimisé mobile/tablette (cibles tactiles ≥ 56 px).

## Détails techniques

- `useLiveProducts()` / `useLiveSalesToday()` hooks basés sur des queries React Query rechargées après mutation.
- Formatage FCFA : `1 300 F` (espace insécable).
- Toutes les écritures IndexedDB dans une transaction atomique (produit + vente + items).
- Placeholder `src/routes/index.tsx` remplacé par une redirection vers `/pos`.

## Livraison en un seul jet

Je crée en parallèle : `db.ts`, hooks, 4 routes, composants (`ProductGrid`, `Cart`, `CashPad`, `ProductForm`, `SaleRow`), header, mise à jour styles, redirection index.
