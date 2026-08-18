# ECAISSE

Application de caisse offline-first. Toutes les données vivent dans IndexedDB via Dexie ;
il n'y a **aucune logique serveur** dans l'app — l'orchestrateur (backend + dashboard +
base SQLite) est un dépôt séparé, `simple-sale-orchestrator`, consommé via son API
(`VITE_ORCHESTRATOR_URL`).

## Commandes

| Commande               | Effet                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | serveur de développement                                               |
| `npm run check`        | typecheck + lint — la seule porte à passer avant de livrer             |
| `npm run build`        | build web SSR, cible **Cloudflare Workers** (`.output/`)               |
| `npm run build:static` | coquille SPA statique (`dist/client/`) — cible Vercel **et** Capacitor |
| `npm run precache`     | enchaîné après chaque build, n'a pas à être lancé à la main            |

## Structure

| Chemin                        | Contenu                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `src/lib/db.ts`               | **seul** module qui touche IndexedDB                      |
| `src/lib/analytics.ts`        | agrégations, fonctions **pures** (ni DB ni React)         |
| `src/lib/settings.ts`         | préférences localStorage + thème                          |
| `src/lib/gatekeeper.ts`       | handshake, verrou suspend, messages — appliqués avant toute sync |
| `src/lib/sync.ts`             | orchestration `backgroundSync`/`syncNow` (agrégats 7 j)   |
| `src/components/SuspendedScreen.tsx` | écran blocage dur si suspension                    |
| `src/lib/exports/`            | CSV, Excel, PDF, sauvegarde JSON                          |
| `src/routes/index.tsx`        | page publique de présentation (`/`), hors app             |
| `src/routes/_app.tsx`         | chrome de l'application : en-tête, transition, onboarding |
| `src/routes/_app/`            | les six écrans de l'application (`/pos`, `/stocks`, …)    |
| `src/routes/`                 | routes générées par TanStack Router                       |
| `scripts/inject-precache.mjs` | injecte les assets hashés dans le service worker          |

## Landmines

- **La suspension est un blocage dur** : `SuspendedScreen` (ni croix ni échappement) tant
  que le compte n'est pas relancé. Une vente passée sous suspension resterait non-réglée.
- **Ack implicite + idempotence.** `delivered_at` est posé au handshake suivant
  (`last_applied_command_id`) ; `superseded_at` rend le double clic sur Prolonger inoffensif.
- **Sync = profil + agrégats légers** (7 j, `computePeriodStats`), jamais les lignes de
  vente brutes.
- **`.gitignore` doit rester en UTF-8 sans BOM.** Il a été committé une fois en UTF-16LE :
  git ne parse que l'UTF-8, le fichier devenait un binaire à ses yeux, plus rien n'était
  ignoré et 39 109 fichiers de `node_modules` sont entrés dans le dépôt. Le build Vercel
  échouait alors en exit 126 — git ne conserve pas le bit `+x` sous Windows, donc
  `node_modules/.bin/vite` arrivait sans droit d'exécution.
- **Deux cibles de build, à ne pas confondre.** `npm run build` produit un worker
  Cloudflare que Vercel ne sait pas servir. Le déploiement Vercel passe par
  `build:static` (cf. `vercel.json`) : l'application n'ayant aucune logique serveur, une
  coquille SPA suffit. Le `rewrite` vers `/index.html` est indispensable, et sans danger
  pour `/sw.js` et `/assets/*` que Vercel sert en priorité comme fichiers statiques.
- **L'ordre des plugins Vite compte.** `tanstackStart` doit précéder `viteReact` : il
  génère les routes et les entrées client/serveur que le plugin React transforme ensuite.
  Les deux configs assemblent ces plugins à la main depuis que le wrapper qui les
  composait a été retiré ; toute modification doit être répercutée dans les **deux**.
- **`resolve.dedupe` n'est pas décoratif.** Sans lui, une seconde copie de React ou du
  cache TanStack Query remontée par une dépendance transitive casse les hooks à
  l'exécution, avec une erreur qui ne désigne pas la cause.
- **`public/sw.js` contient deux marqueurs réécrits au build** (`CACHE_VERSION`,
  `PRECACHE_ASSETS`). Les reformater casse silencieusement le précache — le service
  worker se déploie sans erreur et ne se remarque qu'hors ligne.
- **Un seul lockfile.** `package-lock.json` est versionné, `bun.lock` est ignoré : les
  deux ensemble font basculer Vercel d'un gestionnaire de paquets à l'autre et invalident
  son cache à chaque build.
- **`/` est la page de présentation, `start_url` vaut `/pos`.** Le remettre à `/` ferait
  ouvrir la page marketing à chaque lancement de l'application installée. `scope` doit en
  revanche **rester `/`** : sinon la présentation sort du périmètre PWA et un lien vers
  elle rouvre un onglet de navigateur depuis l'application. `/` doit aussi rester dans
  `PRECACHE_PAGES` — ce n'est plus une redirection, c'est un vrai document.
- **`__root.tsx` ne doit contenir AUCUN chrome dépendant de la page.** Le build statique
  ne prérend qu'un document, obtenu en rendant l'application à la racine `/`, et ce
  document sert ensuite toutes les URL. Tout ce que la racine rend est donc figé dedans :
  y placer un en-tête conditionnel a produit une coquille sans en-tête (prérendue sur `/`,
  la page de présentation), et `/pos` comme `/reports` échouaient à l'hydratation
  (« Hydration failed », React jetait le HTML serveur pour tout refaire côté client — sans
  message visible pour l'utilisateur, mais l'erreur était en console à chaque ouverture).
  Le chrome applicatif vit donc dans la route de mise en page `src/routes/_app.tsx` : le
  contenu des routes est rendu APRÈS l'hydratation et peut différer sans rien casser.
  C'est aussi ce qui garantit que l'assistant de premier lancement — dialogue BLOQUANT,
  ni croix ni échappement ni clic extérieur — ne peut pas s'ouvrir par-dessus la page
  publique : il n'y est tout simplement pas monté.
- **Safari construit le raccourci iOS depuis la page ouverte**, pas depuis `start_url`.
  Le bouton d'installation de `/` navigue donc vers `/pos` **avant** d'afficher la marche
  à suivre. Inverser cet ordre produit une icône qui rouvre la page marketing.
- **Les suppressions sont logiques**, jamais physiques (`deleted_at`). Toute nouvelle
  lecture dans `db.ts` doit filtrer via `alive()`, sinon les enregistrements supprimés
  ressortent.
- **Une vente `status: "open"` n'est PAS du chiffre d'affaires.** C'est une addition de
  table en cours : l'argent n'est pas dans la caisse. Elle vit dans le même store que les
  ventes réglées, donc toute lecture de ventes passe par `listSales()` — qui applique
  `paid()` en plus d'`alive()` — et **jamais** par `db.sales` en direct. Les additions en
  cours se lisent par `listOpenTables()`, dont le nom dit ce qu'il rend. Oublier ce filtre
  gonfle silencieusement revenus, marge, panier moyen et exports d'un montant que personne
  n'a payé.
- **Le stock d'une table part à la COMMANDE, pas au paiement** (`addRound`). La bouteille a
  quitté le frigo au moment de la tournée : c'est ce qui rend l'alerte « stock insuffisant »
  utile pendant le service. `cancelSale` restaure — elle sert aussi bien aux ventes réglées
  qu'aux additions ouvertes, ne pas en écrire une seconde.
- **Prix, coûts et catégories sont figés dans la ligne de vente** (`price_at_sale`,
  `cost_at_sale`, `category_at_sale`). Ne jamais recalculer un bénéfice par jointure sur
  la fiche produit : cela réécrirait l'historique.
