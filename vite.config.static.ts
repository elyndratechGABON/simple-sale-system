// Second mode de build, pour l'enveloppe Capacitor (application Android).
//
// Pourquoi un fichier séparé plutôt qu'une variable d'environnement : les scripts npm
// s'exécutent via cmd sur Windows et sh ailleurs, `VAR=1 vite build` n'est pas portable.
// Un `--config` l'est.
//
// `vite.config.ts` reste le build de production habituel (SSR, cloudflare-module) : le
// déploiement web n'est pas touché. Ici on active le mode SPA de TanStack Start, qui
// prérend une coquille HTML statique — c'est ce dont Capacitor a besoin, il ne sait servir
// que des fichiers.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Pas de nitro ici : il produit un serveur cloudflare-module, inutile pour un paquet
  // statique, et son répertoire de sortie (.output) fait échouer l'étape de prérendu qui
  // cherche le serveur de prévisualisation dans dist/server.
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
      // Capacitor charge `index.html` à la racine du webDir. Sans ce chemin la coquille
      // s'appellerait `_shell.html` et l'application native ouvrirait une page blanche.
      prerender: { outputPath: "/index" },
    },
  },
});
