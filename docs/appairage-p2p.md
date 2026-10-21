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
| 11 | L'employé démissionne | bouton « Démission » | 0 | relais + orchestrateur | `device.leave` | **E** — la démission ne parlait qu'au relais : l'orchestrateur, qui tient le quota, n'apprenait rien → **la place restait occupée à vie**. |

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
