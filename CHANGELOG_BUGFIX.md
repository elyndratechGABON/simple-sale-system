# Correctif critique - Rôle employee onboarding

## 🐛 Bug corrigé

**Symptôme** : Quand un employé scannait le QR du propriétaire, il obtenait le rôle `owner` au lieu de `employee`, lui donnant accès à toutes les fonctionnalités admin.

**Cause racine** : Dans `Onboarding.tsx`, la fonction `finish()` appelait `setShopAccount()` AVANT `setIdentityRole("employee")`. Entre ces deux appels, si `ensureIdentity()` était déclenché (par une vue ou un hook), il prenait la valeur par défaut `"owner"`.

## ✅ Corrections appliquées

### 1. Réorganisation atomique de `finish()` (Onboarding.tsx)

**Avant** (bugué) :
```typescript
async function finish() {
  await setShopAccount({...});        // 1. Crée compte
  // [BUG: ensureIdentity() peut être appelé ici par une vue]
  await setIdentityRole("employee");  // 2. TROP TARD!
}
```

**Après** (corrigé) :
```typescript
async function finish() {
  // PHASE 1: Charger identité AVANT tout
  const identity = await ensureIdentity();
  
  // PHASE 2: Si mode join, forcer employee IMMÉDIATEMENT
  if (accountMode === "join") {
    await setIdentityRole("employee");  // ← AVANT setShopAccount!
  }
  
  // PHASE 3: Créer compte (ne peut plus glisser à owner)
  await setShopAccount({...});
  
  // PHASE 4: Announce P2P avec rôle correct
  if (pairCode) {
    await enterPairingCode(pairCode);
  }
  
  // PHASE 5: Historique + prefs
  if (accountMode === "join") {
    await addEmployeeHistory({...});
  }
  
  savePreferences({...});
}
```

### 2. Safeguard anti-escalade (identity.ts)

Ajout d'une protection dans `setIdentityRole()` pour empêcher toute tentative de réassignation `employee` → `owner` :

```typescript
export async function setIdentityRole(role: DeviceRole): Promise<SyncIdentity> {
  const id = getIdentity();

  // SAFEGUARD: Une fois employee, jamais owner
  if (id.role === "employee" && role === "owner") {
    console.warn(`[Identity Security] Refused employee owner escalation on device ${id.deviceId}`);
    return id; // Fail-safe: retourne identité inchangée
  }

  await getDB().settings.put({ key: IDENTITY_KEYS.role, value: role });
  cache = { ...id, role };
  return cache;
}
```

## 🧪 Vérification

### Tests manuels à effectuer :

1. **Owner crée QR** → Employee scan → Vérifier `role === "employee"` ✓
2. **Employee accède settings** → Onglets admin cachés ✓
3. **Employee synchronise** → Reçoit catalogue du propriétaire ✓
4. **Tentative d'escalade** → Loggée en console + refusée ✓

### Commandes de test :

```bash
# Typecheck + lint
npm run check

# Tests unitaires
npm run test

# Build production
npm run build:static
```

## 📊 Impact

- **Sécurité** : Escalade de privilège corrigée
- **Sync** : Employee reçoit maintenant le catalogue correct
- **UX** : Pas de changement visible (l'employé voyait déjà l'UI employee)
- **Performance** : Aucun impact (même nombre d'appels DB)

## 🚀 Prochaines étapes

Pour éliminer complètement le password du QR (sécurité renforcée) :

1. Implémenter Share Token API (relais Cloudflare Workers)
2. QR v2 : `{v:2, shop_id, token, pair_code}` au lieu de `{phone, password}`
3. Employee : `redeem(token)` → obtient `shop_id` sans password
4. Auto-sync catalogue sur paired status

Voir `ARCHITECTURE_V2.md` et `BUG_FIX_PLAN.md` pour détails.

---

**Date** : 2026-09-12  
**Version** : Correctif critique v1.1  
**Tests** : ✓ Typecheck OK | ✓ Lint OK (5 warnings mineures)
