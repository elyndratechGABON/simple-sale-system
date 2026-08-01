<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Caisse POS

Application de caisse offline-first. Toutes les données vivent dans IndexedDB via Dexie ;
il n'y a **aucune logique serveur**.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run check` | typecheck + lint — la seule porte à passer avant de livrer |
| `npm run build` | build web SSR, cible **Cloudflare Workers** (`.output/`) |
| `npm run build:static` | coquille SPA statique (`dist/client/`) — cible Vercel **et** Capacitor |
| `npm run precache` | enchaîné après chaque build, n'a pas à être lancé à la main |

## Structure

| Chemin | Contenu |
|---|---|
| `src/lib/db.ts` | **seul** module qui touche IndexedDB |
| `src/lib/analytics.ts` | agrégations, fonctions **pures** (ni DB ni React) |
| `src/lib/settings.ts` | préférences localStorage + thème |
| `src/lib/exports/` | CSV, Excel, PDF, sauvegarde JSON |
| `src/routes/` | routes générées par TanStack Router |
| `scripts/inject-precache.mjs` | injecte les assets hashés dans le service worker |

## Landmines

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
- **`public/sw.js` contient deux marqueurs réécrits au build** (`CACHE_VERSION`,
  `PRECACHE_ASSETS`). Les reformater casse silencieusement le précache — le service
  worker se déploie sans erreur et ne se remarque qu'hors ligne.
- **Un seul lockfile.** `package-lock.json` est versionné, `bun.lock` est ignoré : les
  deux ensemble font basculer Vercel d'un gestionnaire de paquets à l'autre et invalident
  son cache à chaque build.
- **Les suppressions sont logiques**, jamais physiques (`deleted_at`). Toute nouvelle
  lecture dans `db.ts` doit filtrer via `alive()`, sinon les enregistrements supprimés
  ressortent.
- **Prix, coûts et catégories sont figés dans la ligne de vente** (`price_at_sale`,
  `cost_at_sale`, `category_at_sale`). Ne jamais recalculer un bénéfice par jointure sur
  la fiche produit : cela réécrirait l'historique.
