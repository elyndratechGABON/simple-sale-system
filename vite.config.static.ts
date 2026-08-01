// Second mode de build : coquille SPA statique dans `dist/client/`.
//
// C'est la cible du déploiement Vercel (cf. vercel.json) ET de l'enveloppe Capacitor
// Android. L'application n'a aucune logique serveur — tout vit dans IndexedDB — donc un
// paquet de fichiers statiques suffit, et c'est le seul format que Capacitor sait servir.
//
// Pourquoi un fichier séparé plutôt qu'une variable d'environnement : les scripts npm
// s'exécutent via cmd sur Windows et sh ailleurs, `VAR=1 vite build` n'est pas portable.
// Un `--config` l'est.
//
// Différences avec vite.config.ts, les seules : pas de nitro, et le mode SPA activé.
// Nitro produit un serveur cloudflare-module inutile pour un paquet statique, et son
// répertoire de sortie (.output) fait échouer l'étape de prérendu, qui cherche le
// serveur de prévisualisation dans dist/server.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  // L'ORDRE COMPTE : tanstackStart génère les entrées que viteReact transforme ensuite.
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      spa: {
        enabled: true,
        // Capacitor charge `index.html` à la racine du webDir. Sans ce chemin la
        // coquille s'appellerait `_shell.html` et l'application native ouvrirait une
        // page blanche. Vercel en dépend aussi : son rewrite pointe vers /index.html.
        prerender: { outputPath: "/index" },
      },
    }),
    viteReact(),
  ],
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
});
