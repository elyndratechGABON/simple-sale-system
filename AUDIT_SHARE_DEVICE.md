# AUDIT_SHARE_DEVICE — Audit partage de boutique / QR / synchronisation (ECAISSE)

Date : 30/08/2026 — Périphase 1 du plan (lecture seule, **aucun code modifié**).
Base audité : `simple-sale-system` (app PWA React/TanStack, offline-first, IndexedDB/Dexie) + enveloppe Android Capacitor.
L'orchestrateur (`simple-sale-orchestrator`) est un dépôt séparé, consommé via `VITE_ORCHESTRATOR_URL`.

---

## ÉTAT GLOBAL

| Thème | État | Commentaire court |
|---|---|---|
| **CAMÉRA** | ✅ | Scanner complet, gestion d'erreurs exhaustive, homologation dans le geste. |
| **QR** | ⚠️ | Génération + scan fonctionnels. Mais le QR embarqué est « identifiants + mot de passe en clair », pas un mechanical dédié d'invitation ; **pas de page de diagnostic caméra**. |
| **PAIRING** | ✅ | Deux mécanismes complémentaires (QR tél+mdp → orchestrateur ; code de paire 6 car./10 min → P2P). Approbation + rôles. |
| **STOCKAGE LOCAL** | ✅ | IndexedDB `pos-db` (v19, 16 stores), localStorage ciblé, écritures transactionnelles, suppression logique. |
| **SYNCHRONISATION** | ✅ | Deux canaux additifs (orchestrateur aggégats + relais P2P `/api/v1/ops`), outbox atomique, dedup `processed_ops`, offline-first. |
| **CAPACITOR** | ⚠️ | Android réel présent ; **`@capacitor/camera` importé par le code mais absent de `capacitor.plugins.json`** ; iOS absent (PWA seulement). |
| **PWA** | ✅ | SW écrit main (cache-first pages/assets, précache full), manifest correct, persistent storage. |

---

## 1. CAMÉRA — ✅

**Un seul point d'accès caméra** : `src/hooks/use-barcode-scanner.ts` (410 lignes). Rien d'autre n'ouvre la caméra.

- Ouverture : `acquireWebStream()` (`:64-85`) — `getUserMedia({ video: { facingMode: "environment" } })` puis repli `{ video: true }` (`:74-78`), timeout 10 s (`:42`), **le flux est relâché immédiatement** après homologation (`:84`) ; l'ouverture réelle pour le scan passe par `Html5Qrcode.start` (`:303-308`).
- Permission : `requestCameraActivation()` (`:92-147`) — pré-vol contexte sécurisé (`:94-108`), puis natif Capacitor si `isNativePlatform()` (`Camera.checkPermissions/requestPermissions`, `:112-128`), sinon web dans le geste utilisateur (`:136-147`).
- Erreurs classifiées : `toCameraError()` (`:386-410`) couvre `NotAllowed/Security`→« autorisez la caméra », `NotFound`→« aucune caméra », `NotReadable/busy`→« caméra utilisée », `Overconstrained`→repli, `https`→message dédié. Timeout 10 s → message « Fermez les autres applications ».
- Overlay plein écran hors React (`:154-348`), retry par geste frais (`:274`), démontage sûr via `activeStop` module-level (`:214-221`, cleanup `:362-367`).
- Écrans qui consomment : `/welcome` (Rejoindre via code QR), onboarding étape 2, `/settings` carte Appareils.
- **Manques** : pas d'`enumerateDevices` (pas de liste/sélection de caméra), pas de `BarcodeDetector`, pas de torch/flash, **aucune route de diagnostic caméra**.

## 2. QR — ⚠️

- **Génération** : `DevicePairingDialog.tsx:96-118` — lib `qrcode` (^1.5.4, import dynamique), `toDataURL(text, { width:512, errorCorrectionLevel:"M" })`.
- **Contenu** : `src/lib/pairing.ts:30-42` — `{ v:1, app:"ecaisse", url, name, phone, password }` → **le QR porte téléphone + mot de passe du compte marchand en clair** (défendu dans le code comme « à ne montrer qu'à ses propres appareils »). Un compte « mot clé seul » ne peut pas émettre de QR (`buildPairingPayload` → null).
- **Scan** : `use-barcode-scanner.ts:266` — lib `html5-qrcode` (^2.3.8, import dynamique, chunk préchargé via `__root.tsx:155`), début `facingMode environment` puis repli `user` (`:283-286`).
- **Parsing tolérant** : `parsePairingPayload()` (`pairing.ts:48-80`) accepte le JSON **ou** un texte « téléphone motdepasse » (repli saisie manuelle).
- **Manques par rapport au plan** : aucune notion de `pairingId`/`temporaryToken`/`expiration`/`signature`. Il existe toutefois un **code de paire** 6 carac./10 min (`syncengine/pairing.ts:21-24`) qui joue déjà le rôle de ticket éphémère vérifié localement. **Aucun test ciblé** sur « QR expiré / déjà utilisé / autre boutique / modifié » (ces cas ne s'appliquent pas tels quels à un QR qui n'expire pas).

## 3. PAIRING — ✅

Deux mécanismes qui coexistent et se complètent :

**(A) Voie orchestrateur — QR identifiants** : le principal affiche un QR (tél+mdp) ; le nouvel écran le scanne, pose `setShopAccount` (`db.ts:1950-1969`) puis rejoint par `handshake`. Blocage `device_limit` si quota dépassé (`gatekeeper.ts:349-356`).

**(B) Voie P2P — code de paire + approbation** (`src/lib/syncengine/`) :
- `generatePairingCode()` → 6 carac. (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), TTL 10 min, persisté dans `settings` (`pairing.ts:50-59`).
- L'appareil qui rejoint : `enterPairingCode()` (`:116-122`) → op `device.announce` one-shot (`announced`, `:91-109`).
- Chez le principal : `apply.ts:199-228` — code correct → `status:"paired"` d'office ; sinon `pending` → approbation manuelle (`device.approve`, rôle conféré).
- Rôles : `DeviceRole = "owner"|"manager"|"employee"` (`types.ts:6`), `ROLE_LABELS` (`pairing.ts:26-30`), persistés et propagés.

**⚠️ Limite importante** : le rôle est **cosmétique** — il n'autorise/interdit **aucune** action métier (POS, stocks, rapports). Un employé a les mêmes droits qu'un propriétaire. Pas d'écran de gestion des employés, pas d'audit « qui a vendu » (les ventes n'emportent pas d'identifiant d'appareil/vendeur).

**Identité appareil** : 3 mécanismes distincts non liés entre eux —
1. `ShopProfile.deviceId` (orchestrateur, UUID, `db.ts:1895`);
2. `SyncIdentity.deviceId` (P2P, `IDENTITY_KEYS.device`, `identity.ts:60-68`);
3. `deviceFingerprint` SHA-256 (`device-fingerprint.ts:17-72`) → garantit 1 téléphone = 1 boutique (409 `fingerprint_conflict`, `gatekeeper.ts:275-289`).

## 4. STOCKAGE LOCAL — ✅

- Base **`pos-db`**, classe `PosDatabase` (`db.ts:378-396`), **version 19** (16 stores). Le seul module touchant IndexedDB est `db.ts` (règle structurelle).
- Stores clés : `products, sales, sale_items, settings, subscriptions, shop_profiles, clients, product_expenses, stock_movements, day_closures, rentals, sync_ops, processed_ops, paired_devices, monthly_overviews` (+ `expenses` dropé en v5).
- `SyncFields` sur tout enregistrement (`updated_at`, `deleted_at`, `sync_status`) — suppression **logique**, toutes lectures via `alive()`.
- Écritures **transactionnelles atomiques** : produit + mouvement de stock + op P2P dans la même transaction (`db.ts:826-832`).
- localStorage volontaire pour : `pos_preferences`, `pos_device_fingerprint`, `pos_admin_pin`, `payment_confirmation_pending`, `alerts_seen`.

## 5. SYNCHRONISATION — ✅

Deux canaux **additifs**, jamais bloquants (`sync.ts:9-12`) :

| Canal | Quand / Quoi | Endpoints |
|---|---|---|
| **Orchestrateur** | handshake chaque minute (commandes suspend/renew/broadcast, quota, échéance, mot clé) + `sync-data` agrégats 7 j (jamais de lignes brutes) | `POST /api/v1/handshake`, `POST /api/v1/sync-data`, `DELETE /api/v1/shops/:deviceId` (`gatekeeper.ts`) |
| **Relais P2P** | ops de convergence produits/ventes/stock/clients, relais version aveugle, après handshake réussi | `POST/GET /api/v1/ops?shop_id=` (`syncengine/transport.ts`) |

- Outbox `sync_ops` écrite **dans** la transaction métier (`ops.ts:21-39`), `seq` monotone par appareil.
- Application : tri global déterministe `(created_at, device_id, seq)` (`apply.ts:8-11`), dedup `processed_ops` transactionnelle (`apply.ts:3-14`), LWW + deltas de stock commutatifs.
- Cadences : handshake 60 s (`SYNC_INTERVAL_MS`), agrégats 5 min, TTL ops 30 j (`sync.ts:37-43`). Relance sur événement `online` (`PwaBootstrap.tsx:35-36`).
- **Conflits** : pas de `ConflictResolver` — politique = tri horodaté + dernier-écrit-gagne + deltas. Adapté à produits/clients/stock, mais une édition concurrente d'une même fiche peut régresser silencieusement.
- **Pas de** Background Sync / Periodic Sync API dans le SW (reprise = tick applicatif 60 s + event `online`).
- **Tests existants** : `syncengine/__tests__/sync-engine.test.ts`, `transport.test.ts`, `setup.ts`.

## 6. CAPACITOR — ⚠️

- Config : `capacitor.config.ts` — appId `ga.elyndra.caisse`, `webDir "dist/client"` (build `build:static`).
- Dépendances : `@capacitor/android ^8.5.0`, `@capacitor/camera ^8.2.3`, `@capacitor/core ^8.5.0`, `@capacitor/filesystem ^8.1.2`, `@capacitor/share ^8.0.1`.
- Projet Android : `android/app/.../MainActivity.java`, `AndroidManifest.xml` (INTERNET + CAMERA + FileProvider), `minSdk 24`, `targetSdk 36`, `cap sync` exécuté (build présent dans `assets/public/`).
- **Écart critique** : `android/app/src/main/assets/capacitor.plugins.json` n'enregistre que `filesystem` et `share` — **pas `@capacitor/camera`** alors que `use-barcode-scanner.ts:112-118` l'appelle sur Android. → `Camera.checkPermissions/requestPermissions` échoueraient au runtime. Un `npx cap sync` (ou ajout manuel) doit régénérer le fichier et l'APK doit être retesté.
- **iOS : aucun dossier `ios/`** ; iOS = PWA Safari uniquement (choix assumé).

## 7. PWA — ✅

- SW écrit main `public/sw.js` (221 lignes) : précache avec garde anti-redirection, cache-first pages + assets, revalidation en arrière-plan, réponse 503 « Hors-ligne », réception push notifications.
- Manifest : `start_url "/pos"`, `scope "/"` (règles AGENTS.md respectées).
- `scripts/inject-precache.mjs` injecte `CACHE_VERSION` + `PRECACHE_ASSETS` (tous les chunks, y compris lazy).
- `requestPersistentStorage()` + `autoCloseDay()` + `loadLockState()` avant tout handshake (`PwaBootstrap.tsx:22-42`) → une caisse suspendue le reste hors ligne.
- Installabilité : `lib/pwa.ts` + `hooks/use-pwa-install.ts` (prompt auto, repli iOS).

## 8. PAIEMENT / ABONNEMENT — ✅ (non-régression)

- `PaymentModal.tsx` : USSD `*110#`, référence saisie, `submitSubscriptionRequest` → `POST /api/v1/requests` (plan, `plan_devices`).
- Confirmation : drapeau one-shot `payment_confirmation_pending` (`payment-confirmation.ts`), WhatsApp prérempli **uniquement si** `subscription_request.status === "approved"` au handshake (`rejected` purge sans jamais ouvrir venta), numéro `241076505254`.
- État d'abonnement piloté par le handshake (`renew`→`setShopExpiry`, `suspend`, grace 2 j, quota) ; verrou dur `SuspendedScreen` (suspended / device_limit / keyword_invalid).
- Offres miroir des `PRICE_TIERS` serveur : Essentiel 10k/2, Confort 25k/4, Affluence 50k/8 (`SubscriptionPlanCard.tsx:18-61`).
- **Point à surveiller pour le partage** : un appareil « mot clé seul » et un appareil « tél+mdp » d'un même compte n'ont pas de `shopId` P2P commun calculable localement (`identity.ts:180-182`) ; le paiement n'est pas in-app (validation humaine côté tableau de bord), et les abonnements clients (`subscriptions`) sont purement locaux (aucune op P2P).

---

## ÉCART PHASE PAR PHASE vs PLAN (ce qu'il reste à faire)

| Phase plan | État actuel | Action à prévoir |
|---|---|---|
| P1 Audit | ✅ fait | — |
| P2 Diagnostic caméra | ❌ inexistant | **Créer** `src/routes/_app/diagnostics-camera.tsx` (ou /settings/…) : Secure Context, mediaDevices, getUserMedia, enumerateDevices, Test 5/6/7, état par ligne. |
| P3 Erreurs caméra | ✅ déjà classifiées (`toCameraError`) | Etendre à la page diagnostic (lister NotAllowed/NotFound/NotReadable/Overconstrained/Security/Abort + Réessayer). |
| P4 Scanner QR | ✅ existe (overlay + retry + replis) | Pas de réécriture ; combler : `enumerateDevices`, torch optionnel, message « vidéo noire » déjà couvert par `scan-check.mjs`. |
| P5 Partage boutique | ⚠️ QR actuel = tél+mdp | Décision produit : conserver le QR identifiants ET/OU ajouter un QR « invitation » (`pairingId`, TTL, signature) + code de paire. Le code 6 carac./10 min existe déjà. |
| P6 Nouvel appareil | ✅ (scan → setShopAccount + handshake / code + approve) | Aligner l'UX sur le plan (écran « Boutique trouvée → Demander l'accès ») si besoin. |
| P7 Rôles | ⚠️ owner/manager/employee **cosmétiques** | **Décision** : donner aux rôles une vraie portée (gates métier, audit de vente par vendeur) ou garder cosmétique. |
| P8 Sync initiale | ✅ (chaque appareil a son DB locale ; produits/ventes convergent via ops) | Pas de dump « maître→nouveau » : la convergence passe par le relais. À documenter/valider. |
| P9 Sync continue | ✅ (outbox + relais, offline-first) | Backoff exponentiel éventuel, Background Sync si visé. |
| P10-11 Tests scénarios | ⚠️ 3 fichiers de test P2P, E2E scan-check | **Ajouter** tests Wi-Fi/4G/offline (A-D) + **test de conflit** sur vente simultanée (attendu : 50−3−2=45). |
| P12 Tests QR | ❌ | Ajouter : QR expiré, replay, autre boutique, double scan (le code de paire gère déjà TTL/replay côté `apply.ts`) ; pour le QR tél+mdp, définir le comportement « autre boutique ». |
| P13-14 PWA/Capacitor | ⚠️ | **Corriger `capacitor.plugins.json`** (camera) + retester APK. Tests Chrome/Safari/webview. |
| P15 Paiement | ✅ | Test de non-régression : paiement → handshake → approved → WhatsApp 1× ; partage ne doit pas créer d'états d'abonnement contradictoires (1 device = 1 état via `gatekeeper` partagé par tél+mdp). |
| P16 Tests automatisés | ⚠️ partiel | Batterie : CameraService, QR, Pairing, Device, Rôle, Sync, Offline, Conflits, Subscription. |

---

## QUESTIONS DU PLAN — RÉPONSES RAPIDES

- **Où est généré le QR ?** `DevicePairingDialog.tsx:96-118` (lib `qrcode`).
- **Où est scanné le QR ?** `use-barcode-scanner.ts:266` (lib `html5-qrcode`), overlay plein écran ; entrées : welcome / onboarding / settings.
- **Quelle lib QR ?** `qrcode@1.5.4` (gen), `html5-qrcode@2.3.8` (scan).
- **Comment la caméra est ouverte ?** `getUserMedia` dans le geste (`acquireWebStream`), puis `Html5Qrcode.start` ; natif Capacitor via `Camera.requestPermissions` sur Android.
- **Comment les permissions sont gérées ?** Pré-vol sécurisé + classification complète `toCameraError` + retry par geste.
- **Compte/boutique ?** `shop_profiles` clé `"me"` (storeName + ownerName + account*. accountPhone/Password/Keyword).
- **Appareil ?** `deviceId` (orchestrateur) + `SyncIdentity.deviceId` (P2P) + `deviceFingerprint` — non liés entre eux.
- **Données stockées ?** IndexedDB `pos-db` v19, 16 stores, Dexie ; localStorage ciblé.
- **Sync appareils ?** 2 canaux additifs : handshake+agrégats, et relais d'ops `/api/v1/ops` (outbox `sync_ops`, dedup `processed_ops`).
- **Offline ?** offline-first intégral ; verrou de suspension persisté ; outbox reprise sur tick + event `online`.
- **Capacitor ?** Android réel (webDir `dist/client`) ; plugin caméra **manquant du registre** ; pas d'iOS.
- **Service Worker ?** SwiftPort main `public/sw.js` (cache-first, précache complet, push).

---

## RECOMMANDATIONS PRIORITAIRES (ordre proposé)

1. **P2** Créer la page de diagnostic caméra (retrouve aussi une valeur pour le support) — *prérequis demandé par le plan avant toute correction scanner*.
2. **P3** Étendre le diagnostic aux 6 erreurs types + boutons Réessayer / Ouvrir les réglages.
3. **Fix Capacitor** : régénérer `capacitor.plugins.json` avec `@capacitor/camera` (`npx cap sync`) puis retester l'APK (volet caméra : non-régression).
4. **Décision produit (rôles)** : portée réelle ou cosmétique pour `owner/manager/employee`.
5. **Décision produit (QR tél+mdp en clair)** : conserver, ou introduire un ticket d'invitation éphémère signé (le code de paire couvre déjà l'éphémère côté P2P).
6. **P10-12** Batterie de tests : conflit de ventes (attendu 45), QR expiré/replay/autre boutique, scénarios Wi-Fi/4G/offline.
7. **P16** Tester le fil du soir : paiement → handshake → WhatsApp 1× avec un appareil partagé.