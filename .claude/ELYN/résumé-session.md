# ELYNDRA CAISSE — Résumé de session (simple-sale-system)

## Objective
- Refonte UI/features ELYNDRA CAISSE : workstreams A, G, C, D, B, F, E livrés et vérifiés live. **Nouveau workstream (sans lettre) : canal de notification WhatsApp « paiement confirmé »** — post-validation serveur, jamais la preuve du paiement. **Dernier : compactage des Paramètres + outil « CA & bénéfices » dans l'en-tête** (livré, vérifié live, `npm run check` vert). Le mécanisme inter-dépôt (bridge Android de collecte SMS + PaymentIntent côté orchestrateur) reste à documenter côté `simple-sale-orchestrator`.
- **Décisions utilisateur (Paramètres)** : 1) le Calculateur de profit quitte les cartes → **icône en-tête** « CA & bénéfices » = **CA total en cours = CA du jour** (ventes réglées aujourd'hui, global — le panier POS est page-local, pas lisible depuis le header) + **bénéfice par produit** + calculateur manuel conservé ; 2) licence + « Changer de plan » déplacés dans **Compte et appareils** (carte « Abonnement ») ; 3) **Photo de profil + Logo fusionnés** en carte « Apparence ».

## Important Details
- Projet : `C:\Users\Administrator\Desktop\elywrok\jyls\simple-sale-system-main`, branche `main` ; **`npm run check` vert** (uniquement les 7 warnings fast-refresh préexistants — `SubscriptionPlanCard`, `ui/*`). Dev server http://localhost:8080, MCP Chrome DevTools page 3, vueport 390×844 (mobile).
- **Paramètres après compactage** : section « Boutique » ouverte = **1494 px à 390** (avant 2022-2084 px, −26 %), **1164 px à 768** ; **overflow horizontal 0** à 320/390/768. Cartes retirées/gamètes : les 4 sous-titres d'accordéon, `CardDescription`s de Type de commerce/Installer/Dossier/Sauvegarde, ligne « Compte marchand » de ShopCard (doublon Compte), carnet « Carnet d'adresses **et fidélité** » (aucune fidélité n'existe), logo carte séparée.
- **« Abonnement »** (`settings.tsx`, section Compte) : profil `shop_profile` (staleTime 60 s), `Badge` Licence · N j / Expiré, inscription + jusqu'au, dernière synchro, `PlanChooser` + `PaymentModal` (déplacés tels quels de ShopCard, `paymentPending` inchangé), note `Wifi` synchronisation.
- **« Apparence »** (`settings.tsx`, remplace LogoCard) : photo de profil (`usePreferences().ownerPhoto`, crop 128 → préférence) + logo (`shop_logo` IndexedDB, crop 256), deux `ImageCropper`, un seul en-tête CardTitle « Apparence ».
- **DevicesCard** : sous-bloc « **Téléphone perdu, ou plus de mot de passe ?** » replié dans un `Collapsible` fermé (`CollapsibleTrigger` bouton + `ChevronDown`, état `keywordOpen`).
- **ProfitSheet** (`src/components/ProfitSheet.tsx`, **nouveau**, ouvert depuis un bouton `Calculator` ghost/icon dans `Header.tsx` entre TopNav et NotificationBell, `aria-label="CA du jour et bénéfices"`) : query `["sales","range",lastDaysRange(1)]` (liste ventes jour via `listSalesToday` + `getSaleItemsForSales`) + `["product_expenses",…]` → `computePeriodStats` (= chiffres du tableau de bord) ; gros **CA du jour**, Ventes, Panier moyen, Bénéfice ; **bénéfice par produit** (top 8, qté × prix unitaire = `revenue/qty`, profit `—` tant qu'aucun coût n'est saisi — `expenseByProduct` Map depuis `product_expenses`, `hasCosts` pour la colonne globale) ; **calculateur manuel** « Estimer avant d'encaisser » (prix/coût/qté, marge %, barre) copié de l'ex-`ProfitCard`. Dialog `max-w-md`, scroll interne du `DialogContent` (déjà borné 100dvh−24px).
- **Vérifs live ProfitSheet** (390×844) : CA 2 000 F / 1 vente / panier 2 000 F (vente test Sandwich 1×1000 + Coca 2×500), Bénéfice « — » + note ; lignes produit avec profit « — » ; calculateur 2000/1500/3 → **1 500 F, marge 25 %** ; bouton header présent aux 3 largeurs, overflow 0, header 65 px.

## Work State
### Completed
- **A, G, C, D, B** : terminés et vérifiés (refonte UI listes, tables, produits, etc.).
- **F — Export CSV Historique** : `src/lib/exports/sales-csv.ts` (`salesCsvFilename` + `buildSalesCsvBlob`, BOM, `;`, pied « ELYNDRA CAISSE — ELYNDRA TECH ») ; bouton CSV dans l'en-tête de `history.tsx` ; vérifié live.
- **E — Tuning onboarding cluster** : `KeyRound`/`ICON_MAP`, carte de confirmation sectorielle, mode salon prestation/produit, libellés prix par cluster, cas `location`, écran « éléments ». Vérifié live.
- **Nouveau — WhatsApp notification « Paiement confirmé »** (live vérifié) : `payment-confirmation.ts` (drapeau one-shot + `wa.me` prérempli vers `241076505254`), `PaymentModal.tsx` (pose le drapeau sur `result.ok`), `DevicesCard` (carte verte « Paiement confirmé » quand `approved` + drapeau, purge sur `rejected`/clic).
- **Refonte des filtres de catégories du POS** (livré, vérifié multi-largeurs) : pills → grille `CategoryCard` `grid-cols-2 xs:3 md:4 xl:5 2xl:6`, label « Catégories », hiérarchie verticale 16/12/20px, icônes pastille, filtre intact (Boissons → 5 produits).
- **Améliorations mobile UX de la caisse** (livré, vérifié) : recherche produit, haptique 8ms, bande « Souvent achetés aujourd'hui » (top 8), boutons photo/crayon 28px bas-droit des cartes.
- **Refonte « Trier par » des filtres Stocks** (livré précédemment) : deux groupes STOCK/CATÉGORIES.
- **Paramètres compactés + « CA & bénéfices »** (livré, vérifié live + `npm run check` vert) :
  - Header : bouton `Calculator` ↔ `ProfitSheet` (CA du jour + bénéfice par produit + calculateur manuel).
  - Boutique : `ShopCard` réduit au formulaire identité (photo/licence/sync/compte marchand retirés), `AppearanceCard` (photo + logo), Type de commerce/Tables sans descriptions.
  - Compte : `SubscriptionCard` (licence + Changer de plan + sync) au-dessus de `DevicesCard` ; bloc mot clé replié par défaut.
  - Données : descriptions coupées (Dossier, Sauvegarde) + sous-titres accordéon et « fidélité » supprimés.

### Active
- (none) — tout ce qui était demandé est livré et vérifié.

### Blocked
- (none)

## Next Move
1. Sur demande explicite : commit des workstreams (npm run check vert, prêt).
2. Éventuels finitions proposables : plan wise, mettre la ligne « Enseigne » aussi dans Apparence ; vérifier l'état « Installation » sur stores ; confirmer à l'œil le rendu dela carte verte « Paiement confirmé » (déjà couvert).
3. Documenter (hors dépôt, dépôt orchestrator) : flux SMS → serveur → `approved` ; bridge Android collecte SMS ; PaymentIntent (id, client, montant, statut PENDING) créé avant de lancer l'USSD ; WhatsApp Business API si envoi automatique un jour.
4. Démo : « Test Produit » (400 F, stock 10) encore présent — supprimable sur demande.

## Relevant Files
- `src/components/ProfitSheet.tsx` (**nouveau**) : outil header CA du jour + bénéfice par produit + calculateur manuel.
- `src/components/Header.tsx` : bouton `Calculator` + état `profitOpen` + montage `ProfitSheet`.
- `src/components/ShopCard.tsx` : réduit au formulaire identité (l'essentiel des retraits).
- `src/routes/_app/settings.tsx` : `AppearanceCard` (photo+logo), `SubscriptionCard` (licence/plan), suppression `ProfitCard`, `Collapsible` mot clé, descriptions/sous-titres coupés ; imports nettoyés (`Calculator`, `formatFCFA`, `UserRound`, `ChevronDown`, `CreditCard`, `Wifi`, `PlanChooser`, `PaymentModal`…).
- `src/components/PaymentModal.tsx` + `src/lib/payment-confirmation.ts` : workstream WhatsApp (dév. antérieur).
- `src/lib/exports/sales-csv.ts` + `src/routes/_app/history.tsx` : workstream F.
- `src/components/Onboarding.tsx`, `src/lib/settings.ts` : workstream E.
- `src/hooks/use-subscription.ts` : licence.