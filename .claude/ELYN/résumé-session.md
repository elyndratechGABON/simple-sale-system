# ELYNDRA CAISSE — Résumé de session (simple-sale-system)

## Objective
- Refonte du calculateur de bénéfices du header (« CA & bénéfices ») : passer du **jour**
  au **mois**, avec un parcours « 3 questions » — CA automatique, valeur du stock
  affichée/estimée, charges fixes (loyer, eau, électricité) saisies globalement — puis
  **bénéfice calculé/estimé** + statut 🟢/🟠/🔴.
- Terminer le jalon sync P2P : committé (mode 1) ; refonte calculateur livrée (mode 2).

## Important Details
- **Formule figée (décisions utilisateur)** : Bénéfice = **CA du mois − COGS (Σ
  `cost_at_sale` figés dans les lignes de vente du mois) − charges fixes (montant
  global)**. La valeur du stock restant est **affichée comme repère** (auto-estimée =
  Σ stock×coût, éditable/override), jamais soustraite.
- **Libellé** : « Bénéfice calculé » si toutes les ventes du mois ont un coût
  (`cost_at_sale` > 0), « Bénéfice estimé » sinon + « évaluation partielle » + champ
  complément de coût optionnel.
- **Statut** : 🟢 profit ≥ 0 · 🟠 perte ≤ 10 % du CA · 🔴 sinon. Exemple validé : CA
  1 500 000 · COGS 450 000 · charges 50 000 → 1 000 000 🟢 (marge 67 %).
- **Rappel mensuel** : pastille ambre sur l'icône Calculateur du header tant que le mois
  courant n'a ni charges ni complément renseignés.
- **Hors périmètre (décidé)** : pas de saisie des achats du mois (« stock initial +
  achats − stock final » → plus tard, mode détaillé) ; coûts inconnus → 0 + mention.
- **Bilan mensuel PERSISTÉ** locale : table Dexie v19 `monthly_overviews` (id = « YYYY-MM
  », `charges`, `stock_override` null = auto, `cost_complement`, `updated_at`), fonctions
  `getMonthlyOverview`/`saveMonthlyOverview`, intégrée au snapshot JSON (zod, rétro-
  compatible) et à `purgeAllData`. Données LOCALES — jamais synchronisées.
- Projet : `C:\Users\Administrator\Desktop\elywrok\jyls\simple-sale-system-main`, branche
  `main` ; `npm run check` = typecheck + lint (préttier auto-fix) — **vert** (7 warnings
  fast-refresh préexistants) ; vitest node + fake-indexeddb : **38 tests verts** (24
  existants + 14 `profit.test.ts`). Node v24.16.0. Dev server http://localhost:8080.

## Work State
### Completed
- **Jalon sync P2P committé** : `2070cd57` — `src/lib/syncengine/*` complet + tests,
  `db.ts` v18 (stores `sync_ops`/`processed_ops`/`paired_devices`), `sync.ts`,
  `DevicePairingDialog`, `DevicesCard`, `vitest.config.ts`, ADR
  `docs/adr/0001-moteur-sync-p2p-ops-relais.md` — 22 fichiers, +3335/−257.
- **Workstreams UI committés** : `913fe1a7` (ProfitSheet jour initial, ImageCropper,
  payment-confirmation, sales-csv, use-keyboard-height, Paramètres/Header/Nav/Onboarding/
  pos/stocks/history/reports/PaymentModal/ProductQuickEdit/ShopCard/alerts/analytics/
  styles.css/.claude) — 19 fichiers.
- **Refonte calculateur mensuel** (livrée, vérifiée live + check vert) :
  - `src/lib/db.ts` v19 : table locale `monthly_overviews` (cf. Important Details).
  - `src/lib/profit.ts` (**nouveau**, pur) : `monthKey`/`monthRange`/`previousMonthKey`/
    `nextMonthKey`/`monthLabel`/`currentMonthKey`, `isConsumableStock` (ni service, ni
    actif, stock borné), `estimateStockValue` (Σ stock×coût + partielle known/total),
    `monthlyCostOfGoods` (COGS + CA + coverage + lignes sans coût),
    `computeMonthlyResult`, `resultStatus` (🟢/🟠/🔴), testé 14 cas.
  - `src/components/ProfitSheet.tsx` refondu : sélecteur de mois `‹ Août 2026 ›`
    (défaut courant, « mois suivant » désactivé) ; bascule segmentée Simple/Détaillé ;
    Résumé rapide (CA du mois, ventes, panier moyen, stock restant repère, badge statut
    + « calculé/estimé » + marge) ; « La question de l'argent » (stock pré-rempli auto +
    éditable, liste repliable « Produits & stock » via Collapsible, charges fixes,
    complément si partiel, aperçu live « Résultat en direct », bouton « Calculer mon
    bénéfice » → `saveMonthlyOverview` + toast + invalidation) ; « Comprendre mon
    résultat » (CA − COGS − Charges) ; « Stocks à surveiller » via `buildAlerts`
    (ruptures + seuils min_stock) ; vue Détaillé = bénéfice par produit (coûts des
    Rapports) + calculateur manuel conservé.
  - `src/components/Header.tsx` : `aria-label`/`title` « CA du mois et bénéfices » +
    pastille ambre (`needsCycle`) sur clé de cache `["monthly_overview", clé]`.
  - `src/lib/exports/json.ts` : `monthly_overviews` dans le schema zod (optionnel,
    `updated_at` optionnel) + restauration.
- **Vérifs live** (390×844, Snack Océan) : CA mois 2 500 F / 2 ventes / panier 1 250 F /
  stock repère 53 200 F (partielle 7/9) ; 🟢 Bénéfice calculé 1 100 F (44 %) ; saisie
  charges 500 → aperçu live « 600 F (24 % à l'avantage) » → « Calculer mon bénéfice »
  → toast « Bilan enregistré pour août 2026 », résumé 600 F, « Comprendre mon résultat »
  à jour, bouton re-désactivé, 🟢 pastille header retirée ; « Stocks à surveiller »
  liste Chawarma rupture + Fanta (seuil 10) + Sandwich (seuil 8) ; vue Détaillé rend.
- Donnée de démonstration persistée en local (dev) : charges 500 F sur août 2026.

### Active
- (none) — la refonte est livrée et vérifiée.

### Blocked
- (none)

## Next Move
1. Commit de la refonte (2e commit du mode 2), après validation utilisateur si besoin.
2. Éventuelles finitions : plus tard, le « mode détaillé » d'approvisionnement (stock
   initial + achats − stock final) pour remplacer le complément de coût ; vérifier à
   l'œil le rendu de la pastille ambre quand le mois est vide.

## Relevant Files
- `src/lib/db.ts` : v19 `monthly_overviews` (+ interface `MonthlyOverview`, snapshot,
  purge) ; `cost_at_sale`/`listSales(from,to)`/`listProducts` (filtres `alive`/`paid`).
- `src/lib/profit.ts` (**nouveau**) + `src/lib/profit.test.ts` (**nouveau**) : tout le
  calcul, pur et recalculable à la main.
- `src/components/ProfitSheet.tsx` (**refondu**) : sélecteur de mois + vue Simple/
  Détaillé + MoneyBlock.
- `src/components/Header.tsx` : pastille de rappel du mois + libellé en-tête.
- `src/lib/exports/json.ts` : sauvegarde/restauration `monthly_overviews`.
- `src/lib/alerts.ts` : `buildAlerts` (Stocks à surveiller).
- `src/lib/syncengine/*` : jalon committé — plus actif pour la refonte.