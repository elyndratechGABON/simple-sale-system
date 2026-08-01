// Build de production web : SSR + nitro, cible Cloudflare Workers (`.output/`).
//
// Les plugins sont assemblés À LA MAIN, sans wrapper de configuration : le projet en
// utilisait un, retiré depuis, qui masquait cette composition et imposait sa propre
// chaîne d'outillage de développement. Tout ce qui compte est désormais visible ici.
//
// L'ORDRE DES PLUGINS COMPTE. `tanstackStart` doit précéder `viteReact` : il génère les
// routes et les entrées client/serveur que le plugin React transforme ensuite.
//
// Le déploiement Vercel n'utilise PAS ce fichier — il ne saurait pas servir un worker
// Cloudflare. Voir vite.config.static.ts et vercel.json.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(async ({ command }) => {
  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirige l'entrée serveur de TanStack Start vers src/server.ts (l'enveloppe
      // qui rend une page d'erreur lisible au lieu d'une trace brute).
      server: { entry: "server" },
      // Empêche un module de `src/**/server/**` ou marqué `server-only` d'atterrir
      // dans le bundle client — une fuite silencieuse sinon.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
  ];

  // Nitro seulement au build : en développement il n'a rien à produire, et le charger
  // ralentirait le démarrage du serveur pour rien.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ preset: "cloudflare-module" }));
  }

  plugins.push(viteReact());

  return {
    plugins,
    resolve: {
      // Doublon assumé de `vite-tsconfig-paths` : l'alias reste résolu même si un outil
      // contourne le plugin (scripts, tests, résolution SSR).
      alias: { "@": `${process.cwd()}/src` },
      // Sans ce dédoublonnage, une seconde copie de React ou du cache TanStack Query
      // remontée par une dépendance transitive casse les hooks à l'exécution.
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
    server: { host: "::", port: 8080 },
  };
});
