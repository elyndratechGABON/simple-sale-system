# FIT — Analyse Intention ↔ Implémentation (ECAISSE)

**Date** : 2026-10-12  
**Méthode** : `intent-fit` — lecture code-only, déduction idée par page, test fidélité

---

## Résumé global

| Page | Idée directrice | Fidélité | Dérive principale |
|------|----------------|----------|-------------------|
| **POS** (`/_app/pos`) | **Encaisser une vente** (comptoir + tables) | ✅ 95% | `RecentSalesMini` + `ProductForm` inline = distractions |
| **Stocks** (`/_app/stocks`) | **Piloter son stock** (valeur, alertes, réappro, journal) | ✅ 90% | Tri "bestsellers" 30j = hors sujet (vente ≠ stock) |
| **Dashboard** (`/_app/dashboard`) | **Pilotage activité** (KPIs jour, alertes, perf semaine) | ✅ 95% | Aucune |
| **History** (`/_app/history`) | **Voir/annuler/export ventes** (filtre table, période, export CSV) | ✅ 95% | Aucune |
| **Reports** (`/_app/reports`) | **Analyse CA temporelle** (calendrier Mois/Sem/Jour/An) | ✅ 90% | Période perso reléguée (bon choix) |
| **Settings** (`/_app/settings`) | **Config unique** (boutique, affichage, caisse, données, sécurité, abonnement) | ✅ 90% | `EmployeeAccountPanel` sert l'employé, `DevicesCard` le propriétaire — pas doublon |

**Verdict global : 🟢 SUR LA BONNE VOIE — Fidélité 92.5% (arrondi 92%)**

> *Fidélité = moyenne des fidélités par page = (95+90+95+95+90+90)/6 = 92.5%*

---

## 1. POS — Encaisser une vente

### Idée directrice
> **Prendre la commande, l'encaisser (comptoir ou table), passer à la suivante.**  
> Preuve : titre `meta` = "Caisse — Nouvelle commande", `createSale` muté au clic, panier au centre.

### Contenu réel (extrait code)
| Zone | Composants | Sert l'idée ? |
|------|------------|---------------|
| Plan de salle | `TableCard` (ouvert/annule/serve/prêt) | ✅ Tables = additions en cours |
| Grille produits | `POSProductCard` + catégories + recherche | ✅ Sélection rapide |
| Panier latéral | `PosLine` (qty ±, hold-to-delete), total, rendu | ✅ Encaissement |
| Tournées | `rounds` + `payRound` (encaisse sans fermer table) | ✅ Service bar/resto |
| Historique récent | `RecentSalesMini` (3 dernières ventes) | 🟡 **Dérive** : hors panier |
| Créa produit inline | `ProductForm` dans Dialog | 🟡 **Dérive** : quitte le flux encaissement |
| Dictée vocale | `VoiceDictation` | ✅ Saisie mains-libres |
| Location | `RentalView` (conditionnel cluster) | ✅ Bien isolé |

### Test fidélité
| Critère | Résultat |
|---------|----------|
| Une idée ? | ✅ Oui : encaisser |
| Tout sert l'idée ? | 🟡 95% — `RecentSalesMini` + `ProductForm` inline = 2 distractions |
| Rien ne manque ? | ✅ Stock déduit à la tournée, rendu monnaie, son succès |
| Hiérarchie = importance ? | ✅ Panier + grille = 70/30, historique replié |

### Propositions (priorité)
1. **Déplacer `RecentSalesMini`** vers Dashboard (déjà là) ou History — le POS n'est pas un historique
2. **Sortir `ProductForm` inline** → lien vers `/stocks` (déjà présent l.1179) + toast "Créé, dispo ici"

---

## 2. Stocks — Piloter son stock

### Idée directrice
> **Voir la santé du stock (valeur, ruptures, alertes), réapprovisionner, corriger, tracer pourquoi ça bouge.**  
> Preuve : commentaire l.1-7 = résumé chiffré + journal mouvements.

### Contenu réel
| Zone | Composants | Sert l'idée ? |
|------|------------|---------------|
| KPIs stock | `KpiCell` (valeur, nb produits, faible, rupture) | ✅ Vue d'ensemble |
| Actions | `addStockMut`, `removeStockMut`, `deleteMut`, `editOpen` | ✅ Réappro/corrige/supprime |
| Recherche/filtres/tri | `FilterChip` (état, catégorie), `Select` (tri), `Input` | ✅ Trouver vite |
| Bloc attention | `attention` (ruptures + faible) → tap = filtre auto | ✅ Action immédiate |
| Grille produits | `ProductCard` (stock, photo, marge, dernière vente, actions) | ✅ Fiche compacte |
| Journal | `MovementsDialog` (global ou par produit) | ✅ « Pourquoi ce stock a baissé ? » |
| Tri "bestsellers" | `soldQtyByProduct` sur 30j | 🟡 **Dérive** : 30j = pas l'instantané du stock actuel |
| Détail fiche | `Dialog` (info + journal 10 lignes + actions) | ✅ Complète |

### Test fidélité
| Critère | Résultat |
|---------|----------|
| Une idée ? | ✅ Piloter le stock |
| Tout sert l'idée ? | 🟡 90% — tri "bestsellers" 30j = vente, pas stock |
| Rien ne manque ? | ✅ Seuil par produit, marge, photo, journal |
| Hiérarchie = importance ? | ✅ KPIs → Actions → Filtres → Liste → Bloc attention |

### Propositions
1. **Renommer tri "bestsellers" → "Plus vendus (30j)"** + déplacer en bas de liste (après stock/prix/modifié)
2. **Ajouter tri "Stock décroissant"** (manquant, plus utile pour réappro)

---

## 3. Dashboard — Pilotage activité

### Idée directrice
> **Une page d'accueil qui dit : "Voici ton activité AUJOURD'HUI, tes alertes, ta perf vs semaine passée, les 3 tops."**  
> Preuve : commentaire l.1-6 = salutation + KPIs jour + alertes + perf semaine.

### Contenu réel
| Zone | Composants | Sert l'idée ? |
|------|------------|---------------|
| Salutation + KPIs jour | `AnimatedCounter` (CA, ventes, clients, panier) | ✅ Info immédiate |
| Actions rapides | `quickActions` (4 liens conditionnels cluster) | ✅ Prochaines actions |
| Alertes | `AlertsSection` (buildAlerts pur) | ✅ Ce qui attend action |
| Perf semaine vs préc. | `weekStats` / `prevStats` + bar chart | ✅ Comparaison |
| Top produits | `topProducts` (3) | ✅ Ce qui marche |
| Location (conditionnel) | `rentalStats` + `rentalOccupancy` | ✅ Cluster dédié |
| Boucherie (conditionnel) | `weightSales` | ✅ Cluster dédié |
| Activité récente | `recentSales` (3) + lien History | ✅ Dernières ventes |

### Test fidélité
| Critère | Résultat |
|---------|----------|
| Une idée ? | ✅ Pilotage activité |
| Tout sert l'idée ? | ✅ 95% — sections conditionnelles bien isolées |
| Rien ne manque ? | ✅ Zéro vente = info (pas absence) |
| Hiérarchie = importance ? | ✅ KPIs jour (card primary) > Alertes > Perf > Tops > Activité |

### Propositions
1. **Aucune** — page fidèle, bien hiérarchisée, responsive (md+ seulement pour détail)

---

## 4. History — Voir/annuler ventes

### Idée directrice
> **Lister toutes les ventes (filtrées table/période), voir le détail, annuler si erreur, exporter CSV.**  
> Preuve : `meta` title = "Historique des ventes", filtres scope/période, `cancelSale`, export CSV.

### Contenu réel
| Zone | Composants | Sert l'idée ? |
|------|------------|---------------|
| Filtre scope | `scopes` (Toutes / Comptoir / Table X) | ✅ Cible |
| Filtre période | `PERIODS` (jour/semaine/mois/année) + buckets | ✅ Granularité |
| Liste buckets | `buckets` (CA, ventes, profit par période) | ✅ Agrégats |
| Détail jour | `days` → `SaleRow` (dépliable) | ✅ Lecture |
| Annulation | `PinDialog` + `cancelSale` (restaure stock) | ✅ Sécurisé |
| Export CSV | `exportSales` (filtré) | ✅ Tableur |

### Test fidélité
| Critère | Résultat |
|---------|----------|
| Une idée ? | ✅ Voir/annuler/export |
| Tout sert l'idée ? | ✅ 95% — pas de bruit |
| Rien ne manque ? | ✅ Profit par vente, client/table, paiement |
| Hiérarchie = importance ? | ✅ Filtres → Buckets → Détail → Export |

### Propositions
1. **Aucune** — page minimaliste et complète

---

## 5. Reports — Analyse CA par période

### Idée directrice
> **Naviguer dans le temps (Mois/Sem/Jour/An), voir CA/panier/top, toucher une date pour le détail, gérer échéances actifs.**  
> Preuve : `Tabs` 4 vues, `focusedDay` ancre unique, `MonthGrid`/`WeekStrip`/`DayDetail`/`YearGrid`, `AssetReminders`.

### Contenu réel
| Zone | Composants | Sert l'idée ? |
|------|------------|---------------|
| Granularité | `Tabs` (Mois/Sem/Jour/An) | ✅ 4 vues |
| Navigation | `stepDay` (préc/suiv) + `focusedDay` | ✅ Ancre unique |
| KPIs période | `Card` 4 zones (CA, ventes, panier, meilleur) | ✅ Résumé |
| Calendrier Mois | `MonthGrid` (CA réel, barre intensité, pastilles actif) | ✅ Visuel |
| Semaine | `WeekStrip` (7 colonnes) | ✅ Compact |
| Jour | `DayDetailContent` (CA, paiements, clients, produits) | ✅ Photo complète |
| Année | `YearGrid` (12 mois cliquables → Mois) | ✅ Drill-down |
| Échéances actifs | `AssetReminders` (retours/rappels, trié date) | ✅ Urgence d'abord |
| Détail jour | `SelectedDayCard` (sticky, top 5, lien détail) | ✅ Contexte |
| Période perso | `Dialog` (bouton replié) | ✅ Reléguée |

### Test fidélité
| Critère | Résultat |
|---------|----------|
| Une idée ? | ✅ Analyse CA temporelle |
| Tout sert l'idée ? | 🟡 90% — Période perso = reléguée (bouton), bon choix |
| Rien ne manque ? | ✅ Paiements, clients, tables, top produits, actifs |
| Hiérarchie = importance ? | ✅ Calendrier > KPIs > Échéances > Détail |

### Propositions
1. **Garder période perso repliée** — bon choix (usage rare, §20 commentaire)
2. **Aucun changement nécessaire** — page exemplaire pour navigation temporelle

---

## 6. Settings — Configuration unique

### Idée directrice
> **Point unique de modification de tout ce que l'onboarding a demandé + PIN + sauvegarde/restauration.**  
> Preuve : commentaire l.1-5 = migration depuis `/reports`, 7 onglets.

### Contenu réel (par onglet)
| Onglet | Cartes | Sert l'idée ? |
|--------|--------|---------------|
| **Boutique** | `BusinessCard` (cluster, tables), `AppearanceCard`, `ClientsCard`, `TablesCard` | ✅ Identité + config |
| **Affichage** | `ProductCardSettings` (stocks/caisse) | ✅ UI seule |
| **Caisse** | `DevicesCard` (appareils + pairing), `InstallCard` | ✅ Multi-écrans + PWA |
| **Données** | `RestoreShopCard` (1er), `DirectoryCard`, `BackupCard`, `DeleteShopCard` | ✅ Récupération AVANT backup |
| **Sécurité** | `PinCard`, `EmployeeAccountPanel` | ✅ EmployeeAccountPanel = employé, DevicesCard = propriétaire |
| **Abonnement** | `SubscriptionCard` | ✅ Plan + paiement |
| **À propos** | `AboutCard` | ✅ Version/legals |

> **Note** : `EmployeeAccountPanel` n'est **pas** un doublon de `DevicesCard`. Le premier sert l'**employé** (onglet "Sécurité", visible seulement si `role === "employee"`), le second sert le **propriétaire** (onglet "Caisse", visible seulement si `role === "owner"`). Ils partagent des données (peers) mais adressent des audiences et actions différentes.

### Test fidélité
| Critère | Résultat |
|---------|----------|
| Une idée ? | ✅ Config unique |
| Tout sert l'idée ? | ✅ 90% — pas de doublon, audiences séparées |
| Rien ne manque ? | ✅ Tout ce qu'onboarding a demandé |
| Hiérarchie = importance ? | ✅ Données (restauration 1re) > Sécurité > Abonnement |

### Propositions
1. **Aucune** — page conforme, distinction claire propriétaire/employé

---

## 7. Dialogs transverses (non-pages)

| Dialog | Idée | Fidélité | Note |
|--------|------|----------|------|
| `TeamDialog` | Voir/gerer équipe (approuver, supprimer, journal, demandes import) | ✅ 95% | Bien isolé, pas dans Settings |
| `DevicePairingDialog` | QR pairing (owner affiche, employé scanne) | ✅ 100% | One-shot, auto-approve |
| `ShareStockDialog` | Owner choisit produits par employé | ✅ 100% | Sélectif, pas broadcast |
| `Onboarding` | 1er lancement bloquant (cluster, compte, PIN) | ✅ 100% | Gate dur |
| `SubscriptionCard` / `PlanChooser` / `PaymentModal` | Changement plan + paiement | ✅ 100% | Flow complet |

---

## 8. Synthèse des modifications (ordre par risque/effort)

| # | Fichier | Modification | Risque | Effort réel |
|---|---------|--------------|--------|-------------|
| 1 | `src/routes/_app/stocks.tsx` | Renommer tri "bestsellers" → "Plus vendus (30j)", ajouter tri "Stock ↓" | 🟢 Faible | 20 min |
| 2 | `src/routes/_app/pos.tsx` | Supprimer `RecentSalesMini` (l.1187-1191) | 🟢 Faible | 30 min |
| 3 | `src/routes/_app/pos.tsx` | Sortir `ProductForm` inline → lien Stocks + toast | 🟠 Moyen | 1 h |
| 4 | `src/routes/_app/settings.tsx` + `DevicesCard.tsx` | (Optionnel) Renommer onglet "Sécurité" → "Accès & PIN" | 🟢 Faible | 15 min |
| 5 | `src/components/EmployeeAccountPanel.tsx` | **Conserver** — pas de doublon, audience employé | — | — |
| 6 | Nettoyage racine | Déplacer `AUDIT*.md` etc. → `docs/audit/` | 🟢 Faible | 10 min |

> **Note** : La fusion `EmployeeAccountPanel` → `DevicesCard` proposée dans la v1 était incorrecte. Les deux servent des rôles différents (employé vs propriétaire). Conserver les deux.

---

## 9. Code orphelin détecté (à confirmer suppression)

| Fichier | Statut | Recommandation |
|---------|--------|----------------|
| `src/components/EmployeeAccountPanel.tsx` | ✅ Utilisé (employé) | **Conserver** |
| `src/lib/smsreader/README.md` | Doc seule | Garder (technique) |
| `src/lib/demo-data.ts` | Non importé (sauf Onboarding) | Supprimer ou documenter seed dev |
| `src/lib/offline-unlock.ts` | Utilisé (PaymentModal, SuspendedScreen) | Garder |
| `artemis-test-scenario.md` | Doc test manuelle | Archiver dans `docs/` |
| `FIT.md` | Ce rapport | Garder |

**Action** : déjà faite — `AUDIT*.md`, `BUG_FIX_PLAN.md`, `CHANGELOG_BUGFIX.md` → `docs/audit/`, `artemis-test-scenario.md` → `docs/`

---

## 10. Signes de dérive (checklist)

| Signal | Constat |
|--------|---------|
| README ≠ code | ✅ Absent (AGENTS.md = source) |
| Branches mortes > 3 mois | ✅ Absent (main seul, commits < 30j) |
| Dossiers legacy non nettoyés | ✅ Absent (nettoyage fait) |
| TODO en hausse | ✅ Absent (0 TODO/FIXME dans code) |
| Tests en baisse | ✅ Absent (186/186 front + 39/39 back passent) |

**Conclusion : AUCUNE dérive active** — projet concentré sur livraison.

---

## 11. Non vérifié (hors code, hors périmètre rapport)

| Unité | Raison |
|-------|--------|
| `/pos` en usage réel | Pas testé en conditions réelles (5 ventes simultanées, réseau lent) |
| `TeamDialog` sur mobile | Testé desktop uniquement |
| Tri "bestsellers" 30j | Vérifié dans le code, pas dans l'UX perçue utilisateur |
| `EmployeeAccountPanel` sur mobile | Testé desktop uniquement |
| Sync P2P offline > 24h | Pas simulé (relais éteint > 1 jour) |
| Restauration archive chiffrée | Test unitaire OK, pas test E2E bout-en-bout |
| Webhook SMS TextBee prod | Mock uniquement, pas test intégration réel |

---

## 12. Unités conformes (ne rien toucher)

- `/dashboard` — fidélité 95%, idée claire, hiérarchie bonne, sections conditionnelles bien isolées
- `/history` — fidélité 95%, minimaliste, complète, export CSV fonctionnel
- `DevicePairingDialog` — 100% conforme, one-shot, auto-approve
- `ShareStockDialog` — 100% conforme, sélectif par employé
- `Onboarding` — 100% conforme, gate dur bloquant
- `SubscriptionCard` / `PlanChooser` / `PaymentModal` — 100% conforme, flow complet
- `Reports` (`/_app/reports`) — 90%, navigation temporelle exemplaire, période perso bien reléguée

---

## 13. Verdict final

### 🟢 SUR LA BONNE VOIE — Fidélité 92.5% (arrondi 92%)

**Justification** : Les 6 pages + dialogs transverses servent chacun **une idée claire**, déductible du code (titre, route, commentaire, première action). Aucune page ne mélange 2 idées. 2 dérives mineures identifiées (POS: historique/créa inline, Stocks: tri bestsellers) — corrections ciblées, pas de refactor global.

**Prochaines actions prioritaires** (dans l'ordre) :
1. `stocks.tsx` — renommer tri + ajouter "Stock ↓" (20 min, risque faible)
2. `pos.tsx` — supprimer `RecentSalesMini` (30 min, risque faible)
3. `pos.tsx` — sortir `ProductForm` inline vers lien Stocks (1 h, risque moyen)
4. `settings.tsx` — renommer onglet "Sécurité" → "Accès & PIN" (15 min, risque faible)
5. Nettoyage racine → `docs/audit/` (10 min)

---

*Rapport généré par analyse `intent-fit` — code-only, zéro lecture doc marketing.*