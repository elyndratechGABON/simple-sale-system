# Architecture ECAISSE v2 - Share Token Flow

## Problème résolu
- Scan QR employé créait un compte owner au lieu de employee
- Pas de partage de stock entre appareils

##Nouvelle Architecture - Share Token (QR v2)

```mermaid
sequenceDiagram
    participant Owner
    participant Relais
    participant Employee
    participant IndexedDB

    Note over Owner: 1. Génère pair_code (6 lettres)
    Owner->>Owner: generatePairingCode()
    Note over Owner: 2. Demande share_token au relais
    Owner->>Relais: POST /api/v1/share/mint<br/>{shop_id, account_name, account_phone, pair_code}
    Relais-->>Owner: {token: "abc123..."}
    
    Note over Owner: 3. Affiche QR avec token + pair_code
    Owner->>Owner: buildPairingPayload() → QR {v:2, token, pair_code}
    
    Note over Employee: 4. Scan QR
    Employee->>Employee: parsePairingPayload() → {token, pair_code}
    
    Note over Employee: 5. Échange token contre shopId
    Employee->>Relais: POST /api/v1/share/redeem<br/>{token, device_id}
    Relais-->>Employee: {shop_id, account_name, pair_code}
    
    Note over Employee: 6. Crée identity(employee) + shopId
    Employee->>IndexedDB: setIdentity(shopId, role="employee")
    
    Note over Employee: 7. S'annonce avec pair_code
    Employee->>Relais: emitOp(device.announce, pair_code)
    
    Note over Owner: 8. Vérifie pair_code local
    Owner->>Owner: getPairingToken() === pair_code
    
    Note over Owner: 9. Marque comme paired + sync catalogue
    Owner->>IndexedDB: paired_devices.put({status: "paired"})
    Owner->>Relais: emitOp(catalogue.snapshot)
    
    Employee->>Relais: pull(catalogue.snapshot)
    Employee->>IndexedDB: products.put()
```

## Architecture composants

```mermaid
graph TB
    subgraph "DEVICE OWNER"
        A[QR Display] -->|1. pair_code| B[localStorage]
        A -->|2. share_token| C[Relay API]
        B -->|3. compare| D{getPairingToken<br/>== pair_code?}
        D -->|yes| E[paired status]
        D -->|no| F[pending status]
        E -->|4. emit| G[catalogue.snapshot]
    end

    subgraph "RELAY (Cloudflare Workers)"
        C -->|mint| H[(Redis/Neon)]
        I[Employee redeem] --> H
        H -->|store token| J[share_tokens table]
    end

    subgraph "DEVICE EMPLOYEE"
        K[QR Scan] -->|parse| L{token?}
        L -->|yes| M[redeem token]
        M -->|shop_id| N[createIdentity]
        N -->|role=employee| O[IndexedDB]
        O -->|announce| P[device.announce]
    end

    style D fill:#f9f,stroke:#333
    style N fill:#9f9,stroke:#333
    style H fill:#ff9,stroke:#333
```

## Schéma BDD Relais (Neon PostgreSQL - Gratuit)

```sql
-- Table des tokens de partage
CREATE TABLE share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(64) NOT NULL,
    account_name VARCHAR(128),
    account_phone VARCHAR(32),
    pair_code VARCHAR(6) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes',
    redeemed BOOLEAN DEFAULT FALSE,
    redeemed_by_device_id VARCHAR(64),
    redeemed_at TIMESTAMPTZ
);

CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_shop ON share_tokens(shop_id);

-- Table des ops P2P (existante)
CREATE TABLE sync_ops (
    id VARCHAR(128) PRIMARY KEY,
    shop_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    seq INTEGER NOT NULL,
    type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_ops_shop ON sync_ops(shop_id, device_id);
```

## Endpoints relais

```typescript
// POST /api/v1/share/mint
// Génère un token de partage (owner only)
{
  body: {
    shop_id: string,
    account_name: string, 
    account_phone: string,
    pair_code: string  // 6 lettres
  }
}

// POST /api/v1/share/redeem
// Échange token contre shop_id (employee)
{
  body: {
    token: string,
    device_id: string
  }
}
```

## Corrections appliquées

| Bug | Solution v2 |
|-----|-------------|
| Scan crée owner | Token déclenche `role=employee` |
| Pas de stock share | Catalogue auto-sync sur paired |
| QR contient password | Plus de password, token opaque |
| Pairing non sécurisé | Code 6 lettres + token |

## Déploiement Gratuit

| Service | Quota Gratuit | Usage |
|---------|---------------|-------|
| **Neon** | 512MB, 1 projet | BDD PostgreSQL |
| **Cloudflare Workers** | 100K req/jour | API relais |
| **Vercel** | 100GB bandwidth | SPA static |

Coût total: **0€/mois** pour usage small business