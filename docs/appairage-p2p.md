# Appairage P2P — carte du processus

Carte du parcours « le patron ouvre son QR → l'écran employé apparaît chez lui, avec le
stock ». Chaque étape est notée avec son **déclencheur**, son **délai**, son **canal** et
son **point de rupture** (ce qui a été trouvé cassé en production, avec la preuve).

> Règle du produit : **scan → tout arrive, tout seul, en une minute.** Aucun clic sur
> « Synchroniser », aucune intervention. Tout ce qui suit doit donc être automatique.

## Les acteurs et les canaux

| Acteur | Rôle | Canal |
| --- | --- | --- |
| Patron (propriétaire) | crée la boutique, distribue le stock | — |
| Employé | encaisse sur son écran | — |
| **Relais P2P** (`relay-eta-blue`) | boîte aux lettres d'opérations signées | `POST/GET /api/v1/ops` |
| **Orchestrateur** (`simple-sale-orchestrator`) | compte, quota de places, suspension, agrégats | `POST /api/v1/handshake`, `/sync-data` |

Deux canaux **indépendants** : le relais fait la rencontre entre écrans (même hors
Wi-Fi), l'orchestrateur fait la gestion du compte (quota, échéance, verrou).

## Le cycle automatique (ce qui doit tourner sans clic)

`PwaBootstrap` (`src/components/PwaBootstrap.tsx`) → toutes les **60 s**, app ouverte :

```
backgroundSync()
  ├─ runOpsExchange()   → relais : pousse l'outbox, tire les ops du groupe, les APPLIQUE
  ├─ handshake()        → orchestrateur : quota, échéance, suspension, ordres
  ├─ blessPendingPeers()→ rattache les écrans approuvés au compte
  └─ syncData()         → agrégats, au plus toutes les 5 min
```

L'app déclenche aussi un cycle **au démarrage** et **au retour en ligne**. C'est ce qui
fait « tout arrive en une minute » : personne ne clique rien.

## Le parcours, étape par étape

| # | Étape | Déclencheur | Délai | Canal | Ops | Rupture trouvée |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Le patron ouvre « Appareils » → le dialogue s'ouvre | clic | 0 | — | — | — |
| 2 | Le patron **s'annonce** au groupe | automatique | 0 | relais | `device.announce` (rôle `owner`) | **A** — le one-shot d'annonce était global : après un changement de groupe, le patron ne s'annonçait plus **jamais**. Conséquence : l'employé ne pouvait vérifier aucune op du patron (approbation, catalogue) → rien n'arrivait. |
| 3 | Le patron fabrique le QR | automatique | 0 | relais | `share/mint` (jeton 10 min) | **B** — le dialogue frappait **deux** codes à 13 ms d'écart : celui affiché dans le QR et celui gardé en local. L'employé annonçait le premier, le patron comparait au second → la preuve échouait. |
| 4 | L'employé **scanne** le QR | scan caméra | 0 | relais | `share/redeem` | — |
| 5 | L'employé saisit son nom + le code sous le QR | saisie | 0 | relais | `device.announce` (avec `pair_code`) | **D** — le one-shot empêchait toute nouvelle présentation : après un changement de version, l'ancienne annonce restait invérifiable pour toujours. |
| 6 | L'employé pousse son annonce | cycle 60 s | ≤ 60 s | relais | `device.announce` | **C** — le relais stocke le `payload` en **JSONB** : PostgreSQL réordonne les clés, donc la signature (qui porte `JSON.stringify(payload)`) ne se vérifiait plus. **Toute op distante était rejetée en silence.** |
| 7 | Le patron tire le groupe, applique l'annonce | cycle 60 s | ≤ 60 s | relais | `device.announce` | **C** (idem) + **B** (la preuve par code échouait → l'écran restait « à approuver », invisible dans « Caisses synchronisées ») |
| 8 | Le patron publie le catalogue vers le nouvel écran | **même cycle** que 7 | ≤ 60 s | relais | `catalogue.snapshot` | **C** (idem) |
| 9 | L'employé tire le catalogue, l'applique | cycle 60 s | ≤ 60 s | relais | `catalogue.snapshot` | **C** (idem) — le stock n'arrivait pas |
| 10 | L'employé encaisse ; le stock se met à jour chez le patron | cycle 60 s | ≤ 60 s | relais | `sale`, `stock.adjusted` | **C** (idem) |
| 11 | L'employé démissionne ou supprime sa boutique | bouton | 0 | relais + orchestrateur | `device.leave` | **E** — la démission ne parlait qu'au relais : l'orchestrateur, qui tient le quota, n'apprenait rien → **la place restait occupée à vie**. |

## La sixième rupture : le téléphone sur un bundle périmé

Le 21/10, tous les correctifs étaient déployés et vérifiés, et rien ne fonctionnait
quand même. La cause : **le téléphone tournait sur l'ancien bundle**.

Au rechargement, c'est l'**ancien** service worker qui sert la page (cache-first) ; le
nouveau s'installe *pendant* ce rechargement. Il faut donc un **deuxième** rechargement
pour que la nouvelle version prenne la main — et rien ne le dit à l'écran : l'app
paraît vivante, elle ne dialogue simplement avec personne.

La trace dans le relais : **deux jetons frappés à 244 ms** (l'ancien code en frappait
deux) et un code **périmé de neuf heures** dans l'annonce.

D'où la règle : **un déploiement n'atteint les téléphones qu'au deuxième
rechargement**, et il faut le dire à l'utilisateur — d'où le bandeau « Nouvelle version
disponible → Recharger » (`registerServiceWorker`, `controllerchange`).

## Les cinq ruptures, en une phrase chacune

- **A — le patron ne s'annonçait plus** (one-shot global, pas par groupe) : l'employé ne
  pouvait plus rien vérifier du patron.
- **B — deux codes par ouverture de QR** : le patron et l'employé ne portaient pas le
  même code, donc la preuve d'appairage échouait.
- **C — le relais cassait les signatures** (JSONB réordonne les clés) : *toute* op
  distante était rejetée. Le canal P2P était mort, sans le moindre message.
- **D — pas de ré-annonce** après un changement de format de signature : les anciennes
  annonces restaient invérifiables.
- **E — les places n'étaient jamais rendues** : le quota bloquait un commerce qui avait
  eu un employé.

**C est la cause racine du « rien ne se transfère ».** B et D expliquent pourquoi
l'écran n'apparaissait pas chez le patron. A explique pourquoi le stock ne parvenait
pas à l'employé. E explique le « nombre limite d'appareils atteint ».

## Les invariants à garder en tête

1. **Une signature ne doit dépendre que du CONTENU** de l'op, jamais de l'ordre des clés
   (`signableBody` met le payload en forme canonique). Le relais n'est pas libre de
   réordonner.
2. **Un seul code par ouverture de dialogue** : le code affiché, le code frappé au
   relais et le code stocké localement sont le même.
3. **L'annonce est one-shot PAR GROUPE et par FORMAT de signature** : changer de
   boutique ou de version=redonne le droit de se présenter.
4. **Le relais ne comprend rien** : il stocke et rend. Toute la vérité est dans la
   signature et dans le registre local.
5. **Le canal P2P ne doit jamais dépendre de l'orchestrateur** : le relais est public,
   l'orchestrateur peut être éteint.

## Comment vérifier en une minute

1. Patron : Réglages → Appareils → afficher le QR.
2. Employé : scanner, saisir nom + code.
3. **≤ 60 s** : chez le patron, Réglages → Appareils → « Caisses synchronisées » doit
   montrer l'écran employé en vert « Synchronisé » ; chez l'employé, le catalogue et
   le stock du patron doivent être là.
4. Dans le relais, les ops `device.announce` des deux appareils doivent exister pour le
   groupe, et chaque `device_pull` doit avancer.

## Le signal à surveiller : « Jamais »

Chez le patron, chaque écran du groupe affiche **depuis quand il a synchronisé**
(« Il y a 1 h », « Jamais »). C'est LE témoin du canal P2P : un écran qui affiche
« Jamais » n'a jamais rien reçu — l'appairage a pu réussir et le stock, non.

## Capacité (chiffres mesurés, 21/10/2026)

| Poste | Mesure | Où |
| --- | --- | --- |
| Relais (Neon) | 8,5 Mo pour 2 groupes actifs / 28 ops | `neondb.sync_ops` |
| Orchestrateur (Neon) | 9,3 Mo pour 8 boutiques / 4 comptes | `orchestrator.shops` |
| Tir d'un groupe | `LIMIT 5000` ops | `relay/handler.mjs` (`MAX_PULL`) |
| Purge | une op part dès que tous les écrans présents l'ont tirée ; un écran qui ne tire plus depuis 24 h est « absent » et ne bloque rien | `ABSENT_MS` |
| Index du relais | `idx_sync_ops_shop_created (shop_id, created_at)` — le tir reste un parcours d'index | `neondb` |

Le relais ne stocke **que les opérations en vol** : la purge (drainer de
l'orchestrateur : copier puis purger) borne sa taille. Le coût d'une boutique y est
donc proportionnel à son activité, pas au nombre de boutiques.

**Plafonds à connaître** :
- **5 000 ops non purgées par groupe** : au-delà, le relais sert les plus anciennes et
  les plus récentes n'arriveraient plus. La purge l'évite en pratique (un écran qui ne
  tire plus depuis 24 h ne bloque rien) ; un écran qui tire toutes les 23 h, lui,
  bloquerait la purge de son groupe.
- Le **tableau de bord** de l'orchestrateur agrège toutes les boutiques à chaque
  chargement : son coût croît linéairement. Au-delà de quelques centaines de
  boutiques, il faudra paginer (la route `/api/v1/admin/shops` est déjà paginée).
- L'**historique** de l'orchestrateur (`activity_events`, `sync_payloads`) croît par
  boutique et par jour : c'est une question de stockage et dilling, pas de technique.
