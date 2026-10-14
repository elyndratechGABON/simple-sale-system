# ERRORS-KB — Catalogue des erreurs et solutions

> Consulter AVANT toute correction. Enrichir APRÈS chaque nouvelle erreur.
> Format : ERR-XXX — Signature / Cause / Solution / Prévention.

---

## ERR-JSX-001 — Adjacent JSX elements must be wrapped

**Signature** : `Adjacent JSX elements must be wrapped in an enclosing tag`
**Contexte** : Deux éléments JSX côte à côte dans un `return` ou un `.map()`
**Cause** : Pas de fragment `<>...</>` ou de `<div>` englobant
**Solution** :
```tsx
// ❌
return (
  <Dialog>...</Dialog>
  <Autre />
);

// ✅
return (
  <>
    <Dialog>...</Dialog>
    <Autre />
  </>
);
```
**Fichiers impactés** : `TeamDialog.tsx`, `reports.tsx`, `pos.tsx`
**Prévention** : Toujours ouvrir par `<>` si le composant retourne 2+ racines
**Date** : 2026-10-12
**Occurrences** : 3

---

## ERR-TS-001 — Identifier 'X' has already been declared

**Signature** : `Identifier '<name>' has already been declared`
**Contexte** : Deux déclarations de la même variable dans le même scope
**Cause** : Copier-coller, ou fusion de fichiers
**Solution** : Supprimer la 2ᵉ déclaration OU renommer
**Fichiers impactés** : `transport.ts` (db), `reports.tsx` (formatFCFA)
**Prévention** : Un import par symbole. Un `const` par variable.
**Date** : 2026-10-12
**Occurrences** : 4

---

## ERR-TS-002 — Cannot find name 'X' after deletion

**Signature** : `Cannot find name '<name>'`
**Contexte** : Après suppression d'un fichier ou d'une fonction
**Cause** : Un consommateur importe encore le symbole supprimé
**Solution** :
```powershell
# 1. Trouver tous les consommateurs
grep -rn "<name>" src --include="*.ts" --include="*.tsx"

# 2. Supprimer les fichiers consommateurs D'ABORD
# 3. Supprimer la source EN DERNIER
```
**Ordre imposé** : feuilles → racine, JAMAIS l'inverse
**Fichiers impactés** : `analytics.ts`, `alerts.ts`, `dashboard.tsx`, `pos.tsx`
**Prévention** : Ordre feuilles → racine obligatoire pour toute suppression
**Date** : 2026-10-12
**Occurrences** : 2

---

## ERR-IMPORT-001 — Failed to resolve import

**Signature** : `Failed to resolve import "@/<chemin>" from "<fichier>"`
**Contexte** : Après déplacement ou suppression d'un fichier
**Cause** : Import non mis à jour
**Solution** :
```powershell
# 1. Où est le fichier maintenant ?
Get-ChildItem -Path src -Recurse -Filter "<nom>*"

# 2. Lister les imports cassés
grep -rn "<ancien-chemin>" src

# 3. Corriger TOUS les imports dans LE MÊME commit
```
**Fichiers impactés** : `Header.tsx`, `_app.tsx`
**Prévention** : Déplacement = fichier + tous ses imports dans le même commit
**Date** : 2026-10-12
**Occurrences** : 2

---

## ERR-PS-001 — Fichiers corrompus par PowerShell

**Signature** : Fichier `.ts` rejeté "File appears to be binary"
**Contexte** : Utilisation de `git show HEAD:fichier > cible` ou `Set-Content`
**Cause** : PowerShell écrit en UTF-16 (avec BOM) → illisible par tsc
**Solution** :
```powershell
# Jamais :
git show HEAD:src/old.ts > src/new.ts     # ❌

# Toujours :
git checkout HEAD -- src/old.ts            # ✅
```
**Règles** :
- ❌ Jamais `>`, `Set-Content`, `WriteAllText` pour écrire du `.ts`
- ✅ Utiliser les outils d'édition de code (Write/Edit)
- ✅ Utiliser `git checkout` pour restaurer
**Prévention** : PowerShell = commandes (`git`, `npm`), pas éditeur de code
**Date** : 2026-10-12
**Occurrences** : 3

---

## ERR-BUILD-001 — PARSE_ERROR JSON / module

**Signature** : `[PARSE_ERROR] ...`
**Contexte** : Fichier `.ts` corrompu ou syntaxe cassée
**Cause** : Édition non-testée, fichier mal encodé, éditeur inadapté
**Solution** : `git checkout HEAD -- <fichier>` puis recommencer l'édition
**Prévention** : Une seule modification à la fois, `check` après chaque
**Date** : 2026-10-12
**Occurrences** : 2

---

## ERR-DB-001 — Store Dexie fantôme

**Signature** : Store `rentals` reste après suppression du code
**Contexte** : Migration Dexie sans `storeName: null`
**Cause** : Dexie ne supprime pas un store avec `.stores({})` — il faut le déclarer explicitement null
**Solution** :
```ts
this.version(N).stores({
  ...existingStores,
  rentals: null,  // ← déclaration explicite
});
```
**Prévention** : Toute suppression de store = nouveau numéro de version + `null`
**Date** : 2026-10-12
**Occurrences** : 1

---

## ERR-DB-002 — Number() sur un réglage string casse la comparaison

**Signature** : Une comparaison `lastSig?.value === sig` (signature JSON) est toujours fausse → republication à chaque cycle, bruit inutile.
**Contexte** : un accesseur `getSettings(key)` qui coerce `value` en `Number()`
**Cause** : `db.settings` stocke des valeurs mixtes (`number` OU `string` JSON). `Number(sig)` = `NaN` → `NaN === sig` = `false`.
**Solution** : Ne jamais coercer `setting.value` aveuglément. Lire la valeur brute (`(await db.settings.get(key))?.value`) et comparer au type attendu.
**Fichiers impactés** : `src/lib/syncengine/transport/repository.ts` (dossier mort, supprimé le 2026-10-13) — `getSettings` retournait `{ value: Number(setting.value) }`, cassant la garde de `publishFreshCatalog` sur `KEY_LAST_CATALOG_SIG`.
**Prévention** : Un accesseur de réglage typé PAR CLÉ, jamais une coercition globale. Tester avec une valeur string.
**Date** : 2026-10-13
**Occurrences** : 1

---

## ERR-JSX-002 — JSX mal fermé après refactor

**Signature** : `')' expected` + `Unexpected token` sur lignes consécutives
**Contexte** : Après remplacement d'un bloc JSX complexe par un bloc simple
**Cause** : Tokens orphelins de l'ancien bloc (`}`, `)`, `</div>` en trop)
**Solution** :
```powershell
# 1. Lire le bloc entier autour de l'erreur
Get-Content src/fichier.tsx | Select-Object -Skip <N-30> -First 60

# 2. Vérifier l'équilibre des parenthèses/accolades
# 3. Compter les ouvertures et fermetures de la zone
```
**Prévention** : Ne jamais remplacer un bloc sans avoir lu les 20 lignes AVANT et APRÈS
**Date** : 2026-10-12
**Occurrences** : 2

---

## ERR-GIT-001 — git checkout partiel laisse des consommateurs cassés

**Signature** : `Cannot find module` après `git checkout` d'un seul fichier
**Contexte** : Restaurer la source sans restaurer ses consommateurs
**Cause** : Le fichier restauré n'a plus les exports attendus par les consommateurs modifiés
**Solution** :
```powershell
# Jamais un seul fichier :
git checkout HEAD -- src/lib/pairing.ts    # ❌

# Toujours l'ensemble cohérent :
git checkout HEAD -- src/lib/pairing.ts src/components/Onboarding.tsx
# Ou mieux :
git reset --hard HEAD                       # ✅ tout
```
**Prévention** : `git checkout` partiel interdit si plusieurs fichiers modifiés ensemble
**Date** : 2026-10-12
**Occurrences** : 2

---

## ERR-JSX-003 — Ternaire JSX mal fermé (pos.tsx)

**Signature** : `')' expected` + `Unexpected token` sur lignes consécutives
**Contexte** : Après remplacement d'un bloc JSX complexe par un bloc simple dans un ternaire `.map()`
**Cause** : Tokens orphelins de l'ancien bloc (`}`, `)`, `</div>` en trop), fermetures ternaires déséquilibrées
**Solution** :
```powershell
# 1. Lire le bloc entier autour de l'erreur (+30 lignes avant/après)
Get-Content src/routes/_app/pos.tsx | Select-Object -Skip 1195 -First 60

# 2. Vérifier l'équilibre : .map((t) => (  ...  ))  →  chaque ( ouvert = ) fermé
# 3. Compter les ouvertures/fermetures dans la zone ternaire : ternaire = (cond ? (a) : (b))
```
**Prévention** : Ne jamais remplacer un bloc sans avoir lu les 20 lignes AVANT et APRÈS
**Date** : 2026-10-12
**Occurrences** : 1

---

## ERR-GIT-001 — git checkout partiel laisse des consommateurs cassés

**Signature** : `Cannot find module` après `git checkout` d'un seul fichier
**Contexte** : Restaurer la source sans restaurer ses consommateurs
**Cause** : Le fichier restauré n'a plus les exports attendus par les consommateurs modifiés
**Solution** :
```powershell
# Jamais un seul fichier :
git checkout HEAD -- src/lib/pairing.ts    # ❌

# Toujours l'ensemble cohérent :
git checkout HEAD -- src/lib/pairing.ts src/components/Onboarding.tsx
# Ou mieux :
git reset --hard HEAD                       # ✅ tout
```
**Prévention** : `git checkout` partiel interdit si plusieurs fichiers modifiés ensemble
**Date** : 2026-10-12
**Occurrences** : 2

---

## ERR-COMPAT-001 — Contrat P2P à versionner

**Signature** : Champ présent dans QR entre appareils de versions différentes (ex: `tablesEnabled` dans `PairingShopConfig`).

**Contexte** : Le QR de pairing transporte la config boutique (cluster, tables, etc.). Une vieille version envoie `tablesEnabled`, la nouvelle a `features.tables`.

**Cause** : Renommage local sans prévoir la compatibilité ascendante du contrat P2P.

**Solution** :
- Garder le nom d'origine dans le contrat (`PairingShopConfig.tablesEnabled`).
- Mapper vers le nouveau nom en local : `features.tables = shop.tablesEnabled ?? prefs.features?.tables ?? false`.
- **Dual-write temporaire** dans `applyPairingShop` :
  ```ts
  features: { tables: shop.tablesEnabled ?? prefs.features?.tables ?? false },
  tablesEnabled: shop.tablesEnabled ?? prefs.tablesEnabled,  // compat
  ```
- Commenter le dual-write avec la condition de retrait.

**Prévention** : Toujours commenter le dual-write avec la condition de retrait exacte (ex: "retirer quand plus aucun QR v1 en circulation"). Ne jamais renommer un champ de contrat sans mapper.

**Fichiers impactés** : `src/lib/pairing/types.ts`, `build.ts`, `apply.ts`, `useQrPayload.ts`, `finishSetup.ts`

**Date** : 2026-10-13

**Occurrences** : 1

---

## ERR-TS-004 — Ternaire utilisé comme statement

**Signature** : `@typescript-eslint/no-unused-expressions` — `x ? a() : b()` utilisé seul sans assignation.

**Contexte** : Dans une fonction, un ternaire est écrit comme instruction au lieu d'expression.

**Cause** : Confusion entre expression (qui rend une valeur) et instruction (qui effectue une action). `x ? a() : b()` est une expression qui rend `a()` ou `b()`, mais écrit seul comme `x ? a() : b();` il est traité comme une expression statement et ESLint le rejette.

**Solution** :
```ts
// ❌
next.has(id) ? next.delete(id) : next.add(id);

// ✅
if (next.has(id)) {
  next.delete(id);
} else {
  next.add(id);
}
```

**Prévention** : Ternaire = expression (rend une valeur). Instruction = if/else/switch. Ne jamais écrire un ternaire sans l'assigner ou le retourner.

**Fichiers impactés** : `CostBatch.tsx`

**Date** : 2026-10-13

**Occurrences** : 1

---

## ERR-JSX-005 — `.map()` chaîné dans un `useState` initial

**Signature** : `TS1005: ')' expected` sur un `useState(() => x?.map((i) => ({ ... })) ?? [])`.

**Contexte** : Un état local est initialisé à partir d'une liste existante, dans le dialogue `ProductPickerDialog`. L'erreur a résisté à dix éditions successives du même fichier : chaque correction visait la mauvaise parenthèse, et le parseur s'arrêtait à la ligne 111 avant de dire quoi que ce soit d'autre.

**Cause** : `.map()` à l'intérieur d'un `useState` initial cumule trois niveaux de parenthèses imbriquées (`useState(` → `map(` → `({`). Une seule suffit à mal fermer la chaîne, et le message `TS1005` ne désigne que le point de rupture, jamais le déséquilibre réel. **Un `useState` dont l'initialiseur contient un `.map` est le premier fichier à réécrire, pas le premier à retoucher.**

**Solution** : déplacer l'initialisation dans un hook dédié qui reçoit la liste ; le `useState` ne contient plus qu'une valeur déjà construite.
```ts
// ❌ trois niveaux de parenthèses dans l'initialiseur
const [localItems, setLocalItems] = useState<LocalItem[]>(() =>
  items?.map((item) => ({ id: item.id, name: item.name })) ?? []
);

// ✅ le hook porte la conversion, le useState reste plat
const { items: localItems } = useItemsToAdd(initialItems ?? []);
```

**Prévention** : Règle ZÉRO — avant toute correction, `grep docs/ERRORS-KB.md` sur les mots-clés de l'erreur. Si trois éditions du même fichier n'ont pas réglé la même erreur : supprimer le fichier et le recréer depuis la spécification, ne jamais tenter une quatrième édition. Règle de lint : pas de `.map()` dans un `useState` initial.

**Fichiers impactés** : `src/features/pos/ProductPickerDialog.tsx`

**Date** : 2026-10-14

**Occurrences** : 1 (10 tentatives de correction)

---

## ERR-DB-003 — Store déclaré au schéma, oublié dans `snapshot.ts`

**Signature** : un store existe dans `db.version(n).stores()` et dans `PosDatabase`, mais pas dans `snapshot.ts` : ni export, ni restauration, ni purge.

**Contexte** : Ajout de la table `charges` (migration v26). Une table neuve se déclare à un endroit et s'oublie à neuf autres.

**Cause** : `snapshot.ts` n'a pas de source unique — la même liste de tables est répétée à **9 emplacements** : `DatabaseSnapshot`, le `Promise.all` de l'export, la transaction de restauration, son `clear()`, son `bulkPut()`, puis la transaction de purge et son `clear()`. Un store ajouté en oublie un seul, et **rien ne signale l'erreur**.

Le pire : la table n'est ni exportée (perte à la sauvegarde), ni vidée à la restauration (une sauvegarde « vide » se mélange au lieu de remplacer), ni purgée (les charges ressuscitent après « Supprimer la boutique »). Erreur différée de six mois, découverte par un client.

**Solution** : `snapshot-exhaustivity.test.ts` verrouille les deux sens.
```ts
// 1. aller-retour, clear(), purge : comportemental, attrape l'oubli
for (const table of TABLES_SNAPSHOT) { /* put → export → purge → restore → expect 1 ligne */ }

// 2. couverture du schéma : chaque store est SAUVEGARDÉ oulisté dans EXCLUES
const orphelines = getDB().tables.map((t) => t.name)
  .filter((n) => !TABLES_SNAPSHOT.includes(n) && !(n in EXCLUES));
expect(orphelines).toEqual([]);
```
`EXCLUES` porte la raison de chaque exclusion (10 stores sur 18) : un store non listé fait échouer le test, donc la décision « sauvegardé ou non » devient explicite à chaque nouveau store.

**Prévention** : le nombre de listes dupliquées est le vrai risque — les réduire (constante unique partagée par les trois fonctions) est la vraie correction de fond ; le test est le filet. Vérifier l'exhaustivité **avant** de committer une migration de schéma.

**Fichiers impactés** : `src/lib/db/snapshot.ts`, `src/lib/db/snapshot-exhaustivity.test.ts`, `src/lib/db/schema/versions/late-b.ts`

**Date** : 2026-10-14

**Occurrences** : 1 (table `charges`, v26)

---

## ERR-QUERY-001 — `?? null` appliqué à une Promise, pas à sa valeur

**Signature** : `Query data cannot be undefined. Please make sure to return a value other than undefined from your query function. Affected query key: ["…"]`

**Contexte** : Une requête dont la valeur est simplement absente — un réglage jamais saisi, un bilan mensuel pas encore enregistré. TanStack Query refuse `undefined` comme donnée résolue et fait basculer la requête en erreur.

**Cause** : **Le `??` ne s'applique pas à la valeur d'une Promise, mais à la Promise elle-même.** Une Promesse n'est jamais `null` ni `undefined`, donc le garde-fou est silencieusement inerte et la fonction résout plus tard vers `undefined` :
```ts
// ❌ le `??` teste la PROMISE, pas son résultat : inerte
queryFn: () => getSetting<string>("shop_logo") ?? null,

// ✅ il faut AWAITER avant de donner une valeur de repli
queryFn: async () => (await getSetting<string>("shop_logo")) ?? null,
```
Le code se lit comme protégé, et le `?? null` visible rassure : c'est ce qui rend l'erreur si longue à trouver. `TypeScript` ne dit rien non plus — la fonction reste bien typée.

**Solution** : `(await getX()) ?? repli`, ou faire renvoyer `null` par la fonction DB si plusieurs appelants sont concernés.

**Prévention** : devant `() => db.get(...) ?? defaut`, se demander « est-ce que je teste une valeur ou un objet ? ». Convention du dépôt : toute fonction DB « peut être absente » (`getSetting`, `getMonthlyOverview`) garde `undefined`, et **l'appelant** fait `(await …) ?? repli` — c'est déjà le cas de 15 appelsants sur 16. React Query n'accepte jamais `undefined` : la valeur de repli est obligatoire.

**Fichiers impactés** : `src/components/Header.tsx`, `src/features/settings/AppearanceCard.tsx`, `src/components/ProfitSheet/ProfitSheet.tsx`

**Date** : 2026-10-14

**Occurrences** : 2 clés (`shop_logo`, `monthly_overview`), 3 fichiers

---

## ERR-SYNC-001 — Garde `!existing` copiée d'une entité qui a un `created`

**Signature** : un handler `apply` correct sur le papier, qui n'applique jamais rien. Aucun message : l'op est comptée « appliquée », l'écriture est silencieusement sautée.

**Contexte** : `applyChargeSaved`, premier handler d'une entité nouvelle (`charges`). Écrit en copiant `applyProductUpdated` ligne pour ligne, comme demandé — « le pattern EXACT du projet ».

**Cause** : `applyProductUpdated` porte `if (!existing || existing.deleted_at) return;` parce qu'un **`product.created` a déjà posé la ligne** : l'update ne fait que la modifier. Les charges n'ont qu'un seul op (`charge.saved`), il n'y a pas de `charge.created` — donc cette garde annule la **création** :
```ts
// ❌ copié de product.updated : correct là-bas, destructeur ici
const existing = await db.products.get(pl.product_id);
if (!existing || existing.deleted_at) return;

// ✅ source de la ligne AVANT ce handler ? Personne → on crée
const existing = await db.charges.get(pl.charge_id);
if (existing?.deleted_at) return;   // pas de réanimation, mais création permise
```
Le scénario détruit était celui qui avait justifié toute la synchronisation : *le patron saisit « Loyer » sur sa caisse → l'autre poste doit le voir*.

**Solution** : la garde dépend du graphe d'opérations, pas de l'entité. `saved` crée et met à jour (un seul op) ; `deleted` exige `existing` — on ne crée pas une ligne pour la supprimer. Effet de bord de type : `ChargeSavedPayload.fields` ne peut plus être `Partial`, le handler n'ayant plus de ligne existante à compléter.

**Prévention** : avant de copier une garde, se demander *« qu'est-ce qui a posé cette ligne, avant moi ? »*. Réponse « une autre op du même type » → garde `!existing` ; réponse « personne » → pas de garde. Verrouiller par un test comportemental (création + mise à jour), pas par une relecture : `charges-sync.test.ts` passe au vert, et passe au ROUGE en 4 tests sur 5 si on remet la garde.

**Note de sécurité** : l'`Omit<Charge, keyof SyncFields>` du payload est une garantie **de compilation**, pas d'exécution. Un op forgé qui porterait `deleted_at` dans `fields` serait honoré par le spread `{ ...pl.fields }`. C'est assumé et cohérent avec `product.updated` — mais ce n'est **pas** une barrière de sécurité, et il ne faut pas le présenter comme telle.

**Fichiers impactés** : `src/lib/syncengine/apply/charges.ts`, `src/lib/syncengine/types/payloads.ts`

**Date** : 2026-10-14

**Occurrences** : 1

---

## ERR-DB-004 — Table écrite par un handler, absente de la transaction d'application

**Signature** : le handler écrit, la transaction ne couvre pas la table → `NotFoundError`, ou commit qui se ferme (`PrematureCommitError`) sous les pieds de l'appelant.

**Contexte** : `applyChargeSaved` écrit dans `db.charges`. `applyRemoteOps` ouvre sa PROPRE liste de tables (`orchestrate.ts:27-38`) — distincte de celle de `snapshot.ts`, avec les mêmes tables dedans et les mêmes omissions possibles.

**Cause** : même famille que `ERR-DB-003`, liste différente. Ajouter une table au schéma puis à son handler ne demande rien à `orchestrate.ts`, et rien ne signale l'oubli. Le symptôme n'apparaît qu'à la **réception** d'une op distante par un pair — donc en production, chez le client, pas en développement.

**Solution** : `db.charges` ajouté à la liste de la transaction d'application.

**Prévention** : `charges-sync.test.ts` attrape le cas de figure par le comportement (une `charge.saved` reçue doit se poser) — c'est le filet. Reste un TODO : un test d'exhaustivité sur la liste de `orchestrate.ts`, comme `snapshot-exhaustivity.test.ts` pour `snapshot.ts`.

**Fichiers impactés** : `src/lib/syncengine/apply/orchestrate.ts`, `src/lib/charges-sync.test.ts`

**Date** : 2026-10-14

**Occurrences** : 1

---

## ERR-DATA-001 — Trois sources de coût coexistent pour le même chiffre

**Signature** : un bénéfice calculé depuis trois chemins différents, selon la table qu'on lit. L'écran peut afficher un chiffre qui ne correspond à aucun autre écran.

**Contexte** : transition en cours vers un coût d'acquisition saisi sur la fiche produit. Trois mechanisms portant le même nom « coût » coexistent :

| Source | Où | Quand elle alimente le bénéfice |
|---|---|---|
| `cost_at_sale` | figé dans la ligne de vente | quand `product_expenses` est **vide** (`period.ts:98`, `usingLineCosts`) |
| `product_expenses` | store, par `(product_id, period_from)` | quand la table contient **au moins une ligne** |
| `products.cost` | fiche catalogue | **jamais**, aujourd'hui |

**Cause** : `computePeriodStats` bascule entre les deux premières sémantiques sur la seule présence d'une ligne dans `product_expenses`. ⚠ **Ce n'est pas une transition progressive : le seuil est binaire.** Une seule ligne d'historique suffit à faire basculer TOUS les rapports de la boutique, d'un coup, sans migration ni avertissement.

**Impact connu** : l'alerte « produits sans coût » lit `cost_at_sale === 0`, le bénéfice lit `product_expenses`, la saisie écrit `products.cost`. Trois lectures, un chiffre affiché.

**Statut** : **connu, non tranché.** Décision attendue en Phase 5 — (i) `products.cost` devient source unique et `computePeriodStats` cesse de lire `product_expenses`, ou (ii) migration des `product_expenses` existantes vers `products.cost` puis table vidée, ou (iii) statut quo assumé et documenté.

**Pourquoi ce n'est pas corrigé maintenant** : le basculement touche `analytics/period.ts`, le dashboard, l'export de restitution (`restitution/closing.ts:108` fige la signature de clôture dans son `id`) et les rapports orchestrateur — 6 fichiers et plus, pour un chantier d'interface. Une décision de fond mérite son propre plan, pas un patch au milieu d'un écran.

**Fichiers impactés** : `src/lib/analytics/period.ts`, `src/lib/db/reports.ts`, `src/features/reports/CostBatch.tsx`

**Date** : 2026-10-14

**Occurrences** : 1 (documenté, non corrigé)

---

## ERR-UI-001 — Debounce sur un champ monétaire

**Signature** : un coût d'achat enregistré à 20 F au lieu de 20 000 F. Le chiffre faux est écrit, synchronisé aux pairs, et affiché dans un rapport.

**Contexte** : saisie inline du coût unitaire dans les écrans Comptabilité.

**Cause** : un debounce de 500 ms enregistre **pendant** la frappe, à chaque pause. Un vendeur qui tape « 20000 » produit trois écritures — « 2 », « 20 », puis « 20000 » — et les deux premières sont des coûts réels, pas des brouillons. Rien ne les distingue d'une saisie terminée.

**Solution** : enregistrer au **blur** — le geste qui signifie « j'ai fini ». Le blur est aussi la convention déjà en place (`CostBatchRow`, `CostBatch.saveCost`).
```tsx
onBlur={commit}                       // ✅ l'utilisateur a fini de taper
onChange={debouncedSave}               // ❌ sauvegarde des frappes intermédiaires
```

**Prévention** : ne jamais débouncer un champ financier sans confirmation visuelle explicite. Un debounce est un bon réflexe pour un champ de recherche ; pour un montant, c'est une source de données corrompues. Si l'enregistrement doit être automatique, il lui faut un indicateur « enregistré » — sinon on écrit des valeurs que personne n'a fini de saisir.

**Fichiers impactés** : `src/features/reports/ProductCostRow.tsx`

**Date** : 2026-10-14

**Occurrences** : 1

---