# ECAISSE - Architecture System Design

## 📊 Vue d'ensemble
ECAISSE est une application de caisse **offline-first** basée sur :
- **Frontend** : React 19 + TanStack Start (SSR) + Tailwind CSS
- **DB Client** : Dexie (IndexedDB) - unique point de persistance
- **Sync** : P2P engine via relais HTTP (ops-relay)
- **Deploy** : Vercel (SPA statique) + Capacitor (mobile iOS/Android)

## 🏗️ Couches principales

### 1️⃣ PERSISTANCE (src/lib/db.ts)
┌─────────────────────────────────┐
│ Dexie (IndexedDB) - Single Source│
├─────────────────────────────────┤
│ ✓ Products, Sales, Clients      │
│ ✓ Transactions atomiques         │
│ ✓ Soft-delete (deleted_at)       │
│ ✓ Sync fields (updated_at)       │
│ ✓ Paired devices registry        │
└─────────────────────────────────┘

### 2️⃣ SYNC ENGINE (src/lib/syncengine/)
┌───────────────────────────────────────────┐
│ Identity (pairing.ts, identity.ts)        │
│ - shopId (immutable, groupe partage)     │
│ - deviceId (stable per device)            │
│ - Rôle (owner/employee)                   │
├───────────────────────────────────────────┤
│ Transport (transport.ts)                  │
│ - Push: ops locales → relais              │
│ - Pull: ops étrangères ← relais           │
│ - handleDeviceAnnounce: pairing P2P       │
├───────────────────────────────────────────┤
│ Ops (ops.ts, apply.ts)                    │
│ - product.*, sale.*, stock.*              │
│ - device.announce, device.approve         │
│ - catalogue.snapshot/request              │
├───────────────────────────────────────────┤
│ Outbox (outbox.ts)                        │
│ - Queue locale des ops non-synced         │
│ - Idempotence par op.id                   │
└───────────────────────────────────────────┘

### 3️⃣ COMMERCE CORE (src/lib/)
┌──────────────────────────────────┐
│ analytics.ts                     │
│ - Agrégations 7 jours            │
│ - KPIs (CA, marge, panier moyen) │
│ - scopeByDevice (multi-appareil) │
├──────────────────────────────────┤
│ gatekeeper.ts                    │
│ - Suspension compte              │
│ - Quota appareils                │
│ - Handshake orchestrateur        │
├──────────────────────────────────┤
│ pricing.ts, profit.ts            │
│ - Prix, coûts, marges            │
│ - Figés dans SaleItem            │
├──────────────────────────────────┤
│ settings.ts                      │
│ - Prefs localStorage             │
│ - Thème, cluster, domaine        │
└──────────────────────────────────┘

### 4️⃣ ROUTES (src/routes/_app/)
`
/_app.tsx (chrome applicatif)
  ├─ /pos.tsx          → Caisse
  ├─ /stocks.tsx       → Inventaire
  ├─ /dashboard.tsx    → KPIs
  ├─ /reports.tsx      → Exports
  ├─ /history.tsx      → Ventes
  └─ /settings.tsx     → Config
`

### 5️⃣ COMPOSANTS (src/components/)
`
UI/ (radix-ui + shadcn)
├─ Button, Input, Dialog
├─ Select, Tabs, Card
└─ Badge, Alert

POS/
├─ Panier (SaleItemChips)
├─ Paiement (PaymentModal)
├─ Produits (ProductForm)
└─ Code-barres (html5-qrcode)

Onboarding/
├─ QR scanning
├─ Device pairing
└─ Account setup
`

## 🔄 Flux de données

### 💳 Vente (offline)
1. UI clique → POS.tsx
2. addRound() → outbox (SaleCreated, StockAdjusted)
3. Stock décrémenté local (IndexedDB)
4. ✅ Reçu imprimé
5. [ASYNC] Push au prochain sync

### 🔗 Multi-appareil
1. Employee scanne QR → shopId + pairing_token
2. announceDevice() → P2P announce
3. Owner vérifie pair_code local
4. getPairingToken() compare
5. Status: pending → paired
6. Catalogue sync via relais (ops-relay)

### 📡 Synchro
`
exchangeOps():
  1. listPendingOps() → outbox
  2. client.push(shopId, ops) → relais ✓
  3. markOpsSynced()
  4. client.pull(shopId, deviceId) ← relais
  5. applyRemoteOps() → IndexedDB
`

## 🎯 Garde-fous (Landmines)

⚠️ **Suspension = blocage dur**
   - SuspendedScreen : ni croix ni échappement
   - Vente ouverte sous suspension = non-réglée

⚠️ **Soft-delete obligatoire**
   - deleted_at, jamais suppression physique
   - alive() sur TOUTE lecture

⚠️ **Vente status="open" ≠ chiffre d'affaires**
   - listSales() → paid() filter
   - listOpenTables() → addition en cours
   - Oublier = gonfle revenus silencieusement

⚠️ **Stock part à la COMMANDE, pas au paiement**
   - addRound() → stock décrémenté
   - cancelSale() restaure (ventes réglées OU ouvertes)

⚠️ **Prix/coûts figés dans SaleItem**
   - price_at_sale, cost_at_sale, category_at_sale
   - Ne JAMAIS recalculer par jointure produit

⚠️ **Deux cibles de build**
   - npm run build → Cloudflare Worker SSR
   - npm run build:static → SPA Vercel + Capacitor

⚠️ **Relais ops DÉCOUPLÉ de l'orchestrateur**
   - VITE_OPS_URL (sync.ts) vs VITE_ORCHESTRATOR_URL
   - Relais peut tourner en serverless (Neon + CF Function)
   - Secret partagé : OPS_TOKEN

## 📦 Commandes

| Cmd | Effet |
|-----|-------|
| npm run dev | Serveur dev |
| npm run check | typecheck + lint |
| npm run build | SSR → Cloudflare |
| npm run build:static | SPA → Vercel/Capacitor |
| npm run test | Vitest (99 tests) |

## 🔐 Sécurité

✓ Pas de secrets en QR (jeton de partage opaque)
✓ shopId immutable après premier pairing
✓ Soft-delete audit trail
✓ Transactions ACID (Dexie)
✓ Offline = données jamais perdues
✓ Sync idempotent par op.id

## 🎨 Stack UI

- **React 19** (Composition API)
- **TanStack Router** + TanStack Query
- **Tailwind 4** + tw-animate-css
- **Framer Motion** (animations)
- **Recharts** (graphiques)
- **Lucide React** (icônes)
- **Radix UI** + shadcn/ui (composants)

## 📈 Prochaines étapes

1. ✅ Refactor onboarding (QR v2 + pairing_token)
2. ✅ handleDeviceAnnounce() P2P
3. ✅ Vercel build statique (npm run build:static)
4. ⏳ Migration multi-tenant orchestrateur
5. ⏳ Analytics temps réel
