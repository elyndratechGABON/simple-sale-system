# Plan de correction - Bug Onboarding/Pairing

## 🐛 Problème identifié

### Flux actuel (bugué)
```
Employee scan QR (owner)
  ↓
parsePairingPayload() → {phone, password, name}
  ↓
setAccPhone(phone)
setAccPassword(password)
setAccAccountName(name)
  ↓
finish():
  setShopAccount({phone, password}) ← Crée shop_profiles
    ↓
  [ensureIdentity() peut être appelé ici par une vue]
    ↓
  setIdentityRole("employee") ← TROP TARD!
  ↓
Entre les deux → identity défaut = "owner"
```

**Conséquence** : l'employé a le rôle owner au lieu de employee

---

## ✅ Solution : Ordre des opérations atomique

### Architecture corrigée

```typescript
async function finish() {
  // PHASE 1: Initialiser l'identité AVANT tout
  // ──────────────────────────────────────────
  const identity = await ensureIdentity();
  
  // PHASE 2: Si on rejoint (QR scanné), forcer employee IMMÉDIATEMENT
  // ────────────────────────────────────────────────────────────────
  if (accountMode === "join") {
    await setIdentityRole("employee");  // ← AVANT shop account!
  }
  
  // PHASE 3: Poser le compte (ne peut plus glisser à owner)
  // ──────────────────────────────────────────────────────
  await setShopAccount({...});
  
  // PHASE 4: Sync P2P (announce avec rôle correct)
  // ────────────────────────────────────
  if (pairCode && accPhone.trim() && accPassword) {
    await enterPairingCode(pairCode);
  }
  
  // PHASE 5: Historique employé + prefs
  // ──────────────────────────────────
  if (accountMode === "join") {
    await addEmployeeHistory({...});
  }
  
  savePreferences({...});
}
```

---

## 🏗️ Meilleure architecture avec Share Token

Pour éviter que le QR ne transporte JAMAIS d'identifiants sensibles :

### Nouvelle séquence

```
1. OWNER
   generatePairingCode() → "ABC123"
   ↓
   POST /relay /api/v1/share/mint
   {shop_id, account_name, pair_code}
   ↓
   ← {token: "share_xyz..."}
   ↓
   Affiche QR: {v:2, shop_id, token, pair_code}

2. EMPLOYEE
   Scan QR → {v:2, shop_id, token, pair_code}
   ↓
   POST /relay /api/v1/share/redeem
   {token, device_id}
   ↓
   ← {shop_id, account_name, pair_code}
   ↓
   ensureIdentity(shop_id, role="employee")  ← ATOMIQUE
   ↓
   announceDevice(pair_code)
   ↓
   Owner vérifie pair_code local
   ↓
   Status: paired + auto-sync catalogue

3. RELAIS (Neon PostgreSQL - gratuit)
   Table share_tokens:
   - id (UUID)
   - shop_id
   - account_name
   - pair_code
   - token (opaque, 64 chars)
   - created_at
   - expires_at (10 min)
   - redeemed (boolean)
   - redeemed_by_device_id
   - redeemed_at
```

---

## 📋 Fichiers à modifier

### 1. src/components/Onboarding.tsx (BUG FIX)
**Changement** : Réordonner les appels dans `finish()`

```diff
async function finish() {
  const store = name.trim() || "Ma boutique";
  const owner = ownerName.trim();

+  // PHASE 1: Créer/charger identité AVANT tout
+  const identity = await ensureIdentity();
+
+  // PHASE 2: Si join mode (QR scanné), forcer employee IMMÉDIATEMENT
+  if (accountMode === "join") {
+    await setIdentityRole("employee");
+  }

   await saveShopProfile({...});

-  if (pairCode && accPhone.trim() && accPassword) {
+  // PHASE 3: Poser le compte
+  await setShopAccount({...});
+
+  // PHASE 4: Announce avec rôle correct
+  if (pairCode && accPhone.trim() && accPassword) {
     const pairing = await enterPairingCode(pairCode).catch(() => "invalid");
     ...
   }

-  if (accountMode === "join") {
-    const identity = await ensureIdentity();  // ← MOVED UP
-    await setIdentityRole("employee");
-    await addEmployeeHistory({...});
-  }
+  // PHASE 5: Historique employé
+  if (accountMode === "join") {
+    await addEmployeeHistory({...});
+  }

   savePreferences({...});
}
```

### 2. src/lib/syncengine/identity.ts (SAFEGUARD)
**Ajout** : Valider que le rôle employee ne peut pas être overwrite par owner

```typescript
export async function setIdentityRole(role: DeviceRole): Promise<void> {
  const current = getIdentity();
  
  // Une fois employee, jamais owner (sauf reset)
  if (current.role === "employee" && role === "owner") {
    console.warn("Tentative de changer employee → owner : refusée");
    return;
  }
  
  await ensureIdentity();
  const db = getDB();
  await db.settings.put({ key: IDENTITY_KEYS.role, value: role });
}
```

### 3. Relais (Cloudflare Workers - NOUVEAU)
**Endpoints** :

```typescript
// POST /api/v1/share/mint
export async function mintShareToken(req: Request) {
  const {shop_id, account_name, pair_code} = await req.json();
  
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 64);
  
  await db.shareTokens.insert({
    shop_id,
    account_name,
    pair_code,
    token,
    expires_at: new Date(Date.now() + 10 * 60_000),
  });
  
  return {token};
}

// POST /api/v1/share/redeem
export async function redeemShareToken(req: Request) {
  const {token, device_id} = await req.json();
  
  const row = await db.shareTokens.findOne({token});
  if (!row || new Date() > row.expires_at) {
    return new Response('Token expired', {status: 401});
  }
  
  await db.shareTokens.update(row.id, {
    redeemed: true,
    redeemed_by_device_id: device_id,
    redeemed_at: new Date(),
  });
  
  return {
    shop_id: row.shop_id,
    account_name: row.account_name,
    pair_code: row.pair_code,
  };
}
```

### 4. src/lib/pairing.ts (QR v2)
**Changement** : buildPairingPayload() → utilise token au lieu de password

```typescript
export async function buildPairingPayload(role?: DeviceRole): Promise<string | null> {
  const profile = await getShopProfile();
  if (!profile?.shopId) return null;  // ← shopId, pas phone
  
  const pairCode = await getPairingToken();
  const token = await mintShareToken({
    shop_id: profile.shopId,
    account_name: profile.accountName || profile.storeName,
    pair_code: pairCode,
  });
  
  if (!token) return null;  // Relais injoignable
  
  const payload = {
    v: 2,
    app: "ecaisse",
    url: getOrchestratorUrl(),
    shop_id: profile.shopId,
    token,  // ← Token opaque, pas password
    pair_code: pairCode,
    name: profile.accountName || profile.storeName,
    role: role ?? "employee",
  };
  
  return JSON.stringify(payload);
}
```

---

## 🧪 Tests

### Test 1: Employee scan → role=employee
```typescript
test("scan QR → role=employee (not owner)", async () => {
  // 1. Owner affiche QR
  const qr = await buildPairingPayload("employee");
  const parsed = parsePairingPayload(qr);
  
  // 2. Employee ouvre wizard join mode
  // 3. Termine avec SetupWizard({initialAccountMode: "join", ...})
  // 4. Vérifier: identity.role === "employee" ✓
  expect(getIdentity().role).toBe("employee");
});
```

### Test 2: Catalogue auto-sync
```typescript
test("paired employee receives catalogue", async () => {
  // Setup: owner + employee paired
  // Employee: pull ops
  // Verify: products received ✓
  const products = await listProducts();
  expect(products.length).toBeGreaterThan(0);
});
```

### Test 3: Shop info immutable
```typescript
test("shopId immutable after join", async () => {
  const before = getIdentity().shopId;
  // (simulate relay/sync)
  const after = getIdentity().shopId;
  expect(after).toBe(before);  // ✓
});
```

---

## 📦 Déploiement

| Ressource | Gratuit | Usage |
|-----------|---------|-------|
| Neon PostgreSQL | 512MB | Relais BD |
| Cloudflare Workers | 100K req/jour | Endpoints share/* |
| Vercel | 100GB bandwidth | SPA |
| **Total cost** | **0€/mois** | Small biz |

---

## 🚀 Roadmap

- [ ] Phase 1: Fix Onboarding.tsx ordering (5 min)
- [ ] Phase 2: Add safeguard in setIdentityRole (10 min)
- [ ] Phase 3: Implement Share Token endpoints (1h)
- [ ] Phase 4: Update buildPairingPayload → QR v2 (30 min)
- [ ] Phase 5: Test + verify (30 min)
- [ ] Phase 6: Deploy to Neon + Vercel
