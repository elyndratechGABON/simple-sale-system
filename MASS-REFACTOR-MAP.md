# MASS-REFACTOR-MAP.md

## Cartographie des zones à supprimer / simplifier

### 1. LOCATION (cluster 'location') — SUPPRESSION COMPLÈTE

**Fichiers à supprimer :**
- `src/features/rentals/` (dossier entier)
  - `index.ts` — exports publics
  - `components/RentalView.tsx` (196 lignes)
  - `components/RentalBookingDialog.tsx` (274 lignes)
  - `components/RentalReturnDialog.tsx` (275 lignes)
  - `components/RentalReminderBanner.tsx` (41 lignes)
  - `components/RentalCards.tsx` (170 lignes)
  - `components/rental-fields.tsx` (champs spécialisés location)
  - `hooks/use-rentals.ts` (109 lignes)
  - `hooks/use-booking-form.ts` (formulaire location)
  - `lib/rentals.ts` (53 lignes — formules pures location)
  - `lib/fetch-reminders.ts` (26 lignes)

**DB (src/lib/db.ts) — à nettoyer :**
- Store `rentals` (version 17) → à retirer en migration v24+
- Champs `Product` location : `is_asset`, `rental_pricing`, `deposit_amount`, `total_units`, `return_date`, `expected_return_date`, `reminderDate`
- Type `Rental` (lignes 307-345)
- Import `type { ClusterId }` depuis settings (pour Rental.cluster)

**Analytics (src/lib/analytics.ts) :**
- Import `unitsBetween` depuis `@/features/rentals/lib/rentals` (ligne 11)
- Import `type { Rental }` (ligne 17)
- Fonctions `computeRentalStats`, `computeRentalOccupancy` → à supprimer

**Tests :**
- `src/lib/analytics-rentals.test.ts` (219 lignes) → supprimer
- `src/features/rentals/` tests éventuels

**POS (src/routes/_app/pos.tsx) :**
- Import `RentalView` depuis `@/features/rentals` (ligne 64)
- État `rentalPeriod`, `returnDate` (lignes 187-190)
- Logique calcul total location (lignes 286-301)

---

### 2. TABLES COMPLEXES — SIMPLIFICATION RADICALE

**Composants à simplifier :**
- `src/components/pos/TableCard.tsx` (183 lignes) → réduire à carte simple (numéro + état libre/occupée)
- `src/lib/pos/table-stage.ts` — supprimer (états serve/ready/preparing/to-prepare)
- `src/lib/pos/use-table-mutations.ts` — retirer `prepareMut`, `readyMut`, `serveMut`, `roundMut`, `payRoundMut`, `cancelTableMut`

**DB — Sales (src/lib/db.ts) :**
- Champs table à conserver : `table`, `status` ("free"|"occupied" via `opened_at`), `opened_at`
- Champs à supprimer : `served_at`, `preparing_at`, `ready_at`, `rounds_paid`
- SaleStatus : garder seulement "open" | "paid" (pour facture ouverte vs réglée)

**Mutations table :**
- Garder : `openTable` (créé facture vide), `closeTable` (libère), `payTable` (encaisse tout)
- Supprimer : `addRound`, `payRound`, `serveTable`, `prepareTable`, `readyTable`, `cancelTable`

**POS — Plan de salle :**
- Tap table libre → `openTable` (facture vide)
- Tap table occupée → ouvre facture existante
- Pas de cycle service (préparer/prêt/servir)
- Pas de tournées

---

### 3. CLUSTERS — SUPPRESSION SYSTÈME

**Fichiers à modifier :**
- `src/hooks/use-cluster-features.ts` → **SUPPRIMER** (77 lignes)
- `src/lib/settings.ts` — nettoyer `CLUSTER_MAP`, `ACTIVE_CLUSTERS`, types `ClusterId`, `ClusterConfig`, `ClusterWorkflow`, `ClusterStock`, `ClusterFlags`, `WorkflowType`
- `prefs.cluster` → retirer de `Preferences` et `DEFAULT_PREFERENCES`
- Remplacer usages par props produit directes : `hasStock` (stock > 0), `type` ("product"|"service")

**Onboarding (src/components/Onboarding.tsx) :**
- Réduire choix à 4 : Restaurant, Bar, Coiffeur, Personnalisé
- Écrire `prefs.displayedCluster` (cosmétique seulement)
- Supprimer `SUB_CATEGORY_LABELS`, `MAGASIN_SUBS`, étape sous-catégorie magasin
- Supprimer clusters : retail, clothing, weight, magasin, location

---

### 4. ONBOARDING — CHOIX INUTILES

**À supprimer du choix secteur :**
- Épicerie / Alimentation (retail)
- Boutique (Vêtements) (clothing)
- Magasin spécialisé (magasin)
- Boucherie / Charcuterie (weight)
- Location d'actifs (location)

**À garder :**
- Restaurant / Fast-food
- Bar / Snack / Night Club
- Coiffeur / Salon de beauté
- Personnalisé

**Supprimer :**
- `SUB_CATEGORY_LABELS` (settings.ts lignes 501-521)
- Étape 5 sous-catégorie magasin (Onboarding.tsx lignes 783-810)
- Logique `isMagasin` et tout ce qui en dépend

---

### 5. PAIRING — SIMPLIFICATION

**Fichiers à lire ENTIER avant modification :**
- `src/lib/pairing.ts` (259 lignes)
- `src/components/DevicePairingDialog.tsx` (537 lignes)
- `src/lib/syncengine/pairing.ts` (contrat serveur)

**Décision avant code :**
- QR **OU** code 6 chiffres (pas les deux)
- Vérifier que le contrat serveur (handshake, quota, rôle employee forcé) est préservé

---

### 6. NETTOYAGE FINAL — STRUCTURE FEATURES

**Fichiers > 200 lignes à scinder :**
- `src/routes/_app/pos.tsx` (~1300 lignes) → `src/features/pos/`
- `src/components/Onboarding.tsx` (~1200 lignes) → `src/features/onboarding/`
- `src/lib/settings.ts` (~550 lignes) → `src/features/settings/`
- `src/lib/db.ts` (~1100 lignes) → `src/features/db/` ou garder (couche unique)
- `src/components/DevicePairingDialog.tsx` (~540 lignes) → `src/features/team/`

**Nouvelles features :**
```
src/features/
├── pos/
├── products/
├── sales/
├── reports/
├── team/
├── settings/
└── onboarding/
```

**Barrel index.ts par feature.**

---

## Ordre des commits (1 fichier = 1 commit)

1. **analytics-rentals.test.ts** — supprimer (test orphelin)
2. **src/features/rentals/** — supprimer dossier entier (1 commit par fichier ou dossier unique)
3. **src/lib/db.ts** — migration v25 : drop store rentals, retirer champs Product location
4. **src/lib/analytics.ts** — retirer imports + fonctions rental
5. **src/routes/_app/pos.tsx** — retirer RentalView, états rental, logique calcul
6. **src/lib/pos/table-stage.ts** — supprimer
7. **src/lib/pos/use-table-mutations.ts** — simplifier (garder open/close/pay seulement)
8. **src/components/pos/TableCard.tsx** — simplifier à carte basique
9. **src/hooks/use-cluster-features.ts** — supprimer
10. **src/lib/settings.ts** — nettoyer CLUSTER_MAP, types cluster, SUB_CATEGORY_LABELS
11. **src/components/Onboarding.tsx** — réduire à 4 choix, supprimer étapes inutiles
12. **src/lib/pairing.ts** — simplifier (après lecture complète)
13. **src/components/DevicePairingDialog.tsx** — simplifier (après lecture complète)
14. **Scission fichiers > 200 lignes** — 1 commit par fichier déplacé

---

## Portes vertes obligatoires avant CHAQUE commit

```bash
npm run check   # typecheck + lint
npm run test    # tests (vitest)
npm run build   # build web SSR
```

**Règle :** Si une porte casse → `git checkout HEAD -- <fichier>`, recommencer.