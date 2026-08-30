# ADR 0001 — Moteur de synchronisation P2P : ops en clair via le relais, convergence inter-écrans

- Statut : accepté (implémentation livrée : moteur + transport + pairing coopératif)
- Date : 2026-08-30
- Périmètre : `src/lib/syncengine/*`, branches sync de `db.ts` et `sync.ts`

## Contexte

Deux ou trois caisses du même compte marchand doivent partager produits, ventes, stock et
carnets de clients **sans base de données cloud** : « Internet sert à se rencontrer, pas à
être la base de données ». Le backend (`simple-sale-orchestrator`) reste requis pour le
handshake, l'abonnement et la suspension — il ne doit **jamais** héberger les lignes de vente.
Sans mécanisme de convergence, deux mobiles encaissent en aveugle et le rapprochement est
irréparable.

## Décision

### Nœud autonome + outbox

Chaque appareil est un nœud autonome : il travaille hors ligne sans bloquer, et journalise
toute mutation dans un outbox `sync_ops`. Op immuable :

```ts
{ id: `${shortDeviceId}:${seq}`, shop_id, device_id, seq, type, entity_id, payload, created_at }
```

`id` est déterministe (appareil + séquence) : le relais est idempotent par `id`, la
déduplication côté application passe par `processed_ops` (côté dans la MÊME transaction que
l'application effective).

### Deux canaux additifs

1. **Handshake** (`sync-data`) : le profil et des agrégats légers (7 j, `computePeriodStats`),
   **jamais les lignes de vente brutes**.
2. **Ops** (`/api/v1/ops` du relais, `syncengine/transport.ts`) : paquets de convergence
   inter-appareils. `POST {shop_id, ops}` idempotent par `id` ; `GET ?shop_id=` rend **toutes**
   les ops du groupe. Le relais est **aveugle** : il stocke et rend, il n'agrège jamais et ne
   comprend pas les payloads.

Les deux canaux sont **additifs** : le handshake ne porte toujours que les agrégats.

### Pairing coopératif par code de paire

- Le principal (rôle `owner`) affiche un code 6 caractères (jeu lisible
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, TTL 10 min), vérifié **localement** — jamais envoyé net.
- L'employé le saisit → son appareil émet `device.announce` (device_id, public_key,
  employee_name, role, pair_code) ; le principal applique et compare au code local.
- Code juste → `paired` d'office ; sinon → `pending` jusqu'à approbation manuelle
  (`device.approve`, rôle conféré), propagée au groupe.
- Sans code, seuls `owner`/`manager` (rôles de confiance) ou un appareil déjà `paired` sont
  acceptés. Un appareil ne se présente au groupe qu'une fois (drapeau one-shot `announced`).
- Groupes : `s_<hash SHA-256 partiel>` du compte, `kw|<mot-clé>` pour les écrans en flux
  « téléphone perdu », `d_<device>` isolé (zéro fetch). Limite assumée : un écran « mot clé »
  et un écran « téléphone + mot de passe » du même compte n'ont pas de source commune
  calculable localement — fusion à venir côté relais.

### Règles d'intégrité

- Les champs de synchronisation (`updated_at`, `deleted_at`, `sync_status`) sont réécrits
  localement par l'appareil qui applique : l'op n'en transporte pas.
- Stock par deltas (pas de recopie du total). Prix/coûts/catégories **figés dans les lignes
  de vente** (`price_at_sale`…). Suppressions logiques (`deleted_at`), jamais physiques.
- Purge des ops `synced` après 30 j (`purgeSyncedOps`) ; un rejeu éventuel est absorbé par
  `processed_ops`.

## Conséquences

- **Confidentialité du canal** : aujourd'hui les ops transitent **en clair** sur le relais —
  la protection repose sur le lien de confiance du compte. Le matériel RSA-OAEP existe déjà
  (clés par appareil dans `identity.ts`) : le chiffrement E2E est une évolution naturelle,
  **sans changement de schéma ni de relais** (remplacer le contenu, pas le contrat).
- Le relais ne peut pas être compromis au point de réécrire l'historique : chaque appareil
  s'applique ses propres règles, `alive()` et `paid()` contrôlent les lectures.
- La convergence reste paresseuse : pas de réplication temps réel, un échange à chaque
  handshake / `backgroundSync` / `syncNow`.