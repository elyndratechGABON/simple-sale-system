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